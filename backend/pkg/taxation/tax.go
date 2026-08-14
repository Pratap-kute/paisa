package taxation

import (
	"time"

	"github.com/ananthakumaran/paisa/internal/config"
	"github.com/ananthakumaran/paisa/internal/model/cii"
	"github.com/ananthakumaran/paisa/internal/service"
	"github.com/ananthakumaran/paisa/internal/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var (
	EquityGrandfatherDate, DebtIndexationRevocationDate, CiiStartDate time.Time
	oneYear                                                           = time.Hour * 24 * 365
	threeYears                                                        = oneYear * 3
	twoYears                                                          = oneYear * 2
)

func init() {
	EquityGrandfatherDate = lo.Must(time.ParseInLocation("2006-01-02", "2018-02-01", config.TimeZone()))
	DebtIndexationRevocationDate = lo.Must(time.ParseInLocation("2006-01-02", "2023-04-01", config.TimeZone()))
	CiiStartDate = lo.Must(time.ParseInLocation("2006-01-02", "2001-03-31", config.TimeZone()))
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
	dateDiff := sellDate.Sub(purchaseDate)
	gain := sellPrice.Mul(quantity).Sub(purchasePrice.Mul(quantity))

	if (commodity.TaxCategory == config.Equity || commodity.TaxCategory == config.Equity65) && sellDate.Before(EquityGrandfatherDate) {
		return Tax{Gain: gain, Taxable: decimal.Zero, ShortTerm: decimal.Zero, LongTerm: decimal.Zero, Slab: decimal.Zero}
	}

	if (commodity.TaxCategory == config.Equity || commodity.TaxCategory == config.Equity65) && purchaseDate.Before(EquityGrandfatherDate) {
		purchasePrice = service.GetUnitPrice(db, commodity.Name, EquityGrandfatherDate).Value
	}

	if commodity.TaxCategory == config.Debt && purchaseDate.After(CiiStartDate) && dateDiff > threeYears {
		//nolint:gosec // CII index is always a small positive integer <= 1000
		purchasePrice = purchasePrice.Mul(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(sellDate)))).Div(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(purchaseDate))))))
	}

	if commodity.TaxCategory == config.UnlistedEquity && purchaseDate.After(CiiStartDate) && dateDiff > twoYears {
		//nolint:gosec // CII index is always a small positive integer <= 1000
		purchasePrice = purchasePrice.Mul(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(sellDate)))).Div(decimal.NewFromInt(int64(cii.GetIndex(db, utils.FY(purchaseDate))))))
	}

	taxable := sellPrice.Mul(quantity).Sub(purchasePrice.Mul(quantity))
	shortTerm := decimal.Zero
	longTerm := decimal.Zero
	slab := decimal.Zero

	if commodity.TaxCategory == config.Equity || commodity.TaxCategory == config.Equity65 {
		if dateDiff > oneYear {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.10))
		} else {
			shortTerm = taxable.Mul(decimal.NewFromFloat(0.15))
		}
	}

	if commodity.TaxCategory == config.Debt {
		if dateDiff > threeYears && purchaseDate.Before(DebtIndexationRevocationDate) {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	if commodity.TaxCategory == config.Equity35 {
		if dateDiff > threeYears {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	if commodity.TaxCategory == config.UnlistedEquity {
		if dateDiff > twoYears {
			longTerm = taxable.Mul(decimal.NewFromFloat(0.20))
		} else {
			slab = taxable
		}
	}

	return Tax{Gain: gain, Taxable: taxable, ShortTerm: shortTerm, LongTerm: longTerm, Slab: slab}
}
