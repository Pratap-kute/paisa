package taxation

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/cii"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	// Equity bought before this date is grandfathered: the cost of acquisition is
	// stepped up to the value on the day before (31 Jan 2018).
	EquityGrandfatherDate time.Time
	// Long term gains on listed equity are taxed for sales on or after this date.
	// Earlier long term gains were exempt.
	EquityLongTermTaxStartDate time.Time
	// Equity rates changed for sales on or after this date (Budget 2024).
	EquityRateChangeDate         time.Time
	DebtIndexationRevocationDate time.Time
	CiiStartDate                 time.Time
)

func init() {
	EquityGrandfatherDate = lo.Must(time.ParseInLocation("2006-01-02", "2018-02-01", config.TimeZone()))
	EquityLongTermTaxStartDate = lo.Must(time.ParseInLocation("2006-01-02", "2018-04-01", config.TimeZone()))
	EquityRateChangeDate = lo.Must(time.ParseInLocation("2006-01-02", "2024-07-23", config.TimeZone()))
	DebtIndexationRevocationDate = lo.Must(time.ParseInLocation("2006-01-02", "2023-04-01", config.TimeZone()))
	CiiStartDate = lo.Must(time.ParseInLocation("2006-01-02", "2001-03-31", config.TimeZone()))
}

// equityRates returns the short term and long term rates for listed equity sold on
// the given date.
func equityRates(sellDate time.Time) (shortTerm, longTerm decimal.Decimal) {
	if sellDate.Before(EquityRateChangeDate) {
		return decimal.NewFromFloat(0.15), decimal.NewFromFloat(0.10)
	}
	return decimal.NewFromFloat(0.20), decimal.NewFromFloat(0.125)
}

type Tax struct {
	Gain      decimal.Decimal `json:"gain"`
	Taxable   decimal.Decimal `json:"taxable"`
	Slab      decimal.Decimal `json:"slab"`
	LongTerm  decimal.Decimal `json:"long_term"`
	ShortTerm decimal.Decimal `json:"short_term"`
}

func Add(a, b Tax) Tax {
	return Tax{Gain: a.Gain.Add(b.Gain), Taxable: a.Taxable.Add(b.Taxable), LongTerm: a.LongTerm.Add(b.LongTerm), ShortTerm: a.ShortTerm.Add(b.ShortTerm), Slab: a.Slab.Add(b.Slab)}
}

func Calculate(db *gorm.DB, quantity decimal.Decimal, commodity config.Commodity, purchasePrice decimal.Decimal, purchaseDate time.Time, sellPrice decimal.Decimal, sellDate time.Time) Tax {
	gain := sellPrice.Mul(quantity).Sub(purchasePrice.Mul(quantity))

	isEquity := commodity.TaxCategory == config.Equity || commodity.TaxCategory == config.Equity65
	heldOverAYear := calendarYearsExceed(purchaseDate, sellDate, 1)

	// Long term gains on listed equity were exempt until the long term tax began.
	if isEquity && heldOverAYear && sellDate.Before(EquityLongTermTaxStartDate) {
		return Tax{Gain: gain, Taxable: decimal.Zero, ShortTerm: decimal.Zero, LongTerm: decimal.Zero, Slab: decimal.Zero}
	}

	// Grandfathering applies to long term gains only. The cost of acquisition is the
	// higher of the actual cost and the lower of the value on 31 Jan 2018 and the
	// sale price, so it can neither create a loss nor inflate one. Without a price
	// for that day the actual cost is kept.
	if isEquity && heldOverAYear && purchaseDate.Before(EquityGrandfatherDate) {
		fmv := service.GetUnitPrice(db, commodity.Name, EquityGrandfatherDate.AddDate(0, 0, -1)).Value
		if fmv.IsPositive() {
			purchasePrice = decimal.Max(purchasePrice, decimal.Min(fmv, sellPrice))
		}
	}

	// Indexation was removed for units bought on or after 1 Apr 2023, which are
	// taxed at the slab rate on the actual gain.
	indexed := purchaseDate.Before(DebtIndexationRevocationDate)
	if commodity.TaxCategory == config.Debt && indexed && purchaseDate.After(CiiStartDate) && calendarYearsExceed(purchaseDate, sellDate, 3) {
		//nolint:gosec // CII index is always a small positive integer <= 1000
		purchasePrice = purchasePrice.Mul(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(sellDate)))).Div(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(purchaseDate))))))
	}

	if commodity.TaxCategory == config.UnlistedEquity && purchaseDate.After(CiiStartDate) && calendarYearsExceed(purchaseDate, sellDate, 2) {
		//nolint:gosec // CII index is always a small positive integer <= 1000
		purchasePrice = purchasePrice.Mul(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(sellDate)))).Div(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(purchaseDate))))))
	}

	taxable := sellPrice.Mul(quantity).Sub(purchasePrice.Mul(quantity))
	shortTerm := decimal.Zero
	longTerm := decimal.Zero
	slab := decimal.Zero

	if isEquity {
		shortRate, longRate := equityRates(sellDate)
		if heldOverAYear {
			longTerm = taxable.Mul(longRate)
		} else {
			shortTerm = taxable.Mul(shortRate)
		}
	}

	if commodity.TaxCategory == config.Debt {
		if calendarYearsExceed(purchaseDate, sellDate, 3) && purchaseDate.Before(DebtIndexationRevocationDate) {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	if commodity.TaxCategory == config.Equity35 {
		if calendarYearsExceed(purchaseDate, sellDate, 3) {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	if commodity.TaxCategory == config.UnlistedEquity {
		if calendarYearsExceed(purchaseDate, sellDate, 2) {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	return Tax{Gain: gain, Taxable: taxable, ShortTerm: shortTerm, LongTerm: longTerm, Slab: slab}
}

// calendarYearsExceed returns true if the duration from start to end
// exceeds the given number of calendar years. This correctly handles
// leap years unlike a fixed time.Duration comparison.
func calendarYearsExceed(start, end time.Time, years int) bool {
	return end.After(start.AddDate(years, 0, 0))
}
