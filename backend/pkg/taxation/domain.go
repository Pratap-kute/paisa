package taxation

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	c "github.com/ananthakumaran/paisa/pkg/model/commodity"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type HarvestBreakdown struct {
	Units             decimal.Decimal
	PurchaseDate      time.Time
	PurchasePrice     decimal.Decimal
	CurrentPrice      decimal.Decimal
	PurchaseUnitPrice decimal.Decimal
	Tax               Tax
}

type Harvestable struct {
	Account               string
	TaxCategory           string
	TotalUnits            decimal.Decimal
	HarvestableUnits      decimal.Decimal
	UnrealizedGain        decimal.Decimal
	TaxableUnrealizedGain decimal.Decimal
	HarvestBreakdown      []HarvestBreakdown
	CurrentUnitPrice      decimal.Decimal
	CurrentUnitDate       time.Time
}

type TaxPostingPair struct {
	Purchase posting.Posting
	Sell     posting.Posting
	Tax      Tax
}

type FYCapitalGain struct {
	Units         decimal.Decimal
	PurchasePrice decimal.Decimal
	SellPrice     decimal.Decimal
	Tax           Tax
	PostingPairs  []TaxPostingPair
}

type CapitalGain struct {
	Account     string
	TaxCategory string
	FY          map[string]FYCapitalGain
}

type ScheduleALSection struct {
	Code    string
	Section string
	Details string
}

var Sections = []ScheduleALSection{
	{Code: "immovable", Section: "A (1)", Details: "Immovable Assets"},
	{Code: "metal", Section: "B (1) (i)", Details: "Jewellery, bullion etc"},
	{Code: "art", Section: "B (1) (ii)", Details: "Archaeological collections, drawings, painting, sculpture or any work of art"},
	{Code: "vehicle", Section: "B (1) (ii)", Details: "Vehicles, yachts, boats and aircrafts"},
	{Code: "bank", Section: "B (1) (iv) (a)", Details: "Financial assets: Bank (including all deposits)"},
	{Code: "share", Section: "B (1) (iv) (b)", Details: "Financial assets: Shares and securities"},
	{Code: "insurance", Section: "B (1) (iv) (c)", Details: "Financial assets: Insurance policies"},
	{Code: "loan", Section: "B (1) (iv) (d)", Details: "Financial assets: Loans and advances given"},
	{Code: "cash", Section: "B (1) (iv) (e)", Details: "Financial assets: Cash in hand"},
	{Code: "liability", Section: "C (1)", Details: "Liabilities"},
}

type ScheduleALEntry struct {
	Section ScheduleALSection
	Amount  decimal.Decimal
}

type ScheduleAL struct {
	Entries []ScheduleALEntry
	Date    time.Time
}

func GetHarvest(db *gorm.DB) map[string]Harvestable {
	commodities := lo.Filter(c.All(), func(c config.Commodity, _ int) bool {
		return c.Harvest > 0
	})
	postings := query.Init(db).Like("Assets:%").Commodities(commodities).All()
	byAccount := lo.GroupBy(postings, func(p posting.Posting) string { return p.Account })
	return lo.MapValues(byAccount, func(postings []posting.Posting, account string) Harvestable {
		return ComputeHarvestable(db, account, c.FindByName(postings[0].Commodity), postings)
	})
}

func ComputeHarvestable(db *gorm.DB, account string, commodity config.Commodity, postings []posting.Posting) Harvestable {
	available := accounting.FIFO(postings)

	today := utils.EndOfToday()
	currentPrice := service.GetUnitPrice(db, commodity.Name, today)

	harvestable := Harvestable{Account: account, TaxCategory: string(commodity.TaxCategory), HarvestBreakdown: []HarvestBreakdown{}, CurrentUnitPrice: currentPrice.Value, CurrentUnitDate: currentPrice.Date}
	cutoff := utils.Now().AddDate(0, 0, -commodity.Harvest)
	for i := range available {
		p := &available[i]
		harvestable.TotalUnits = harvestable.TotalUnits.Add(p.Quantity)
		if p.Date.Before(cutoff) {
			tax := Calculate(db, p.Quantity, commodity, p.Price(), p.Date, currentPrice.Value, currentPrice.Date)
			harvestable.HarvestableUnits = harvestable.HarvestableUnits.Add(p.Quantity)
			harvestable.UnrealizedGain = harvestable.UnrealizedGain.Add(tax.Gain)
			harvestable.TaxableUnrealizedGain = harvestable.TaxableUnrealizedGain.Add(tax.Taxable)
			harvestable.HarvestBreakdown = append(harvestable.HarvestBreakdown, HarvestBreakdown{
				Units:             p.Quantity,
				PurchaseDate:      p.Date,
				PurchasePrice:     p.Amount,
				CurrentPrice:      currentPrice.Value.Mul(p.Quantity),
				PurchaseUnitPrice: p.Price(),
				Tax:               tax,
			})
		}
	}
	return harvestable
}

func GetCapitalGains(db *gorm.DB) map[string]CapitalGain {
	commodities := lo.Filter(c.All(), func(c config.Commodity, _ int) bool {
		return (c.Type == config.MutualFund || c.Type == config.Stock) &&
			(c.TaxCategory == config.Debt || c.TaxCategory == config.Equity || c.TaxCategory == config.Equity65 || c.TaxCategory == config.Equity35 || c.TaxCategory == config.UnlistedEquity)
	})
	postings := query.Init(db).Like("Assets:%").Commodities(commodities).All()
	byAccount := lo.GroupBy(postings, func(p posting.Posting) string { return p.Account })
	return lo.MapValues(byAccount, func(postings []posting.Posting, account string) CapitalGain {
		return ComputeCapitalGains(db, account, c.FindByName(postings[0].Commodity), postings)
	})
}

func ComputeCapitalGains(db *gorm.DB, account string, commodity config.Commodity, postings []posting.Posting) CapitalGain {
	capitalGain := CapitalGain{Account: account, TaxCategory: string(commodity.TaxCategory), FY: make(map[string]FYCapitalGain)}
	var available []posting.Posting
	for i := range postings {
		p := &postings[i]
		if p.Quantity.GreaterThan(decimal.Zero) {
			available = append(available, *p)
		} else {
			quantity := p.Quantity.Neg()
			totalTax := Tax{}
			purchasePrice := decimal.Zero
			postingPairs := make([]TaxPostingPair, 0)
			for quantity.GreaterThan(decimal.Zero) && len(available) > 0 {
				first := available[0]
				var q decimal.Decimal

				if first.Quantity.GreaterThan(quantity) {
					first.AddQuantity(quantity.Neg())
					q = quantity
					available[0] = first
					quantity = decimal.Zero
				} else {
					quantity = quantity.Sub(first.Quantity)
					q = first.Quantity
					available = available[1:]
				}

				purchasePrice = purchasePrice.Add(q.Mul(first.Price()))
				tax := Calculate(db, q, commodity, first.Price(), first.Date, p.Price(), p.Date)
				totalTax = Add(totalTax, tax)
				postingPair := TaxPostingPair{Purchase: first.WithQuantity(q), Sell: p.WithQuantity(q.Neg()), Tax: tax}
				postingPairs = append(postingPairs, postingPair)
			}
			fy := utils.FY(p.Date)
			fyCapitalGain := capitalGain.FY[fy]
			fyCapitalGain.Tax = Add(fyCapitalGain.Tax, totalTax)
			fyCapitalGain.Units = fyCapitalGain.Units.Add(p.Quantity.Neg())
			fyCapitalGain.PurchasePrice = fyCapitalGain.PurchasePrice.Add(purchasePrice)
			fyCapitalGain.SellPrice = fyCapitalGain.SellPrice.Add(p.Amount.Neg())
			fyCapitalGain.PostingPairs = append(fyCapitalGain.PostingPairs, postingPairs...)

			capitalGain.FY[fy] = fyCapitalGain
		}
	}
	return capitalGain
}

func GetScheduleAL(db *gorm.DB) map[string]ScheduleAL {
	postings := query.Init(db).Like("Assets:%", "Liabilities:%").All()
	scheduleALs := make(map[string]ScheduleAL)

	start := utils.Now().AddDate(1, 0, 0)
	for {
		start = utils.BeginningOfFinancialYear(start)
		postings = lo.Filter(postings, func(p posting.Posting, _ int) bool { return p.Date.Before(start) })
		if len(postings) == 0 {
			break
		}

		start = start.AddDate(0, 0, -1)
		scheduleALs[utils.FYHuman(start)] = ScheduleAL{Entries: ComputeScheduleAL(postings), Date: start}
	}
	return scheduleALs
}

func ComputeScheduleAL(postings []posting.Posting) []ScheduleALEntry {
	scheduleALConfigs := config.GetConfig().ScheduleALs

	return lo.Map(Sections, func(section ScheduleALSection, _ int) ScheduleALEntry {
		cfg, found := lo.Find(scheduleALConfigs, func(scheduleALConfig config.ScheduleAL) bool {
			return scheduleALConfig.Code == section.Code
		})

		var amount decimal.Decimal
		if found {
			ps := accounting.FilterByGlob(postings, cfg.Accounts)
			if section.Code == "liability" {
				ps = lo.Map(ps, func(p posting.Posting, _ int) posting.Posting {
					return p.Negate()
				})
			}
			amount = accounting.CostBalance(ps)
		} else {
			amount = decimal.Zero
		}

		return ScheduleALEntry{
			Section: section,
			Amount:  amount,
		}
	})
}
