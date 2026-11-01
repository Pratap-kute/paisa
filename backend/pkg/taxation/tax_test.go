package taxation

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/cii"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func taxTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&price.Price{}, &cii.CII{}, &posting.Posting{}))
	service.ClearPriceCache()
	t.Cleanup(func() {
		service.ClearPriceCache()
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

func parseDate(d string) time.Time {
	t, _ := time.Parse("2006-01-02", d)
	return t
}

func TestTaxAdd(t *testing.T) {
	a := Tax{
		Gain:      decimal.NewFromInt(100),
		Taxable:   decimal.NewFromInt(80),
		Slab:      decimal.NewFromInt(20),
		LongTerm:  decimal.NewFromInt(6),
		ShortTerm: decimal.NewFromInt(3),
	}
	b := Tax{
		Gain:      decimal.NewFromInt(50),
		Taxable:   decimal.NewFromInt(40),
		Slab:      decimal.NewFromInt(10),
		LongTerm:  decimal.NewFromInt(4),
		ShortTerm: decimal.NewFromInt(2),
	}

	result := Add(a, b)
	assert.Equal(t, "150", result.Gain.String())
	assert.Equal(t, "120", result.Taxable.String())
	assert.Equal(t, "30", result.Slab.String())
	assert.Equal(t, "10", result.LongTerm.String())
	assert.Equal(t, "5", result.ShortTerm.String())
}

func TestCalculateEquity(t *testing.T) {
	db := taxTestDB(t)

	commodity := config.Commodity{
		Name:        "NIFTY50",
		TaxCategory: config.Equity,
	}

	t.Run("short term equity (holding <= 1 year) has 15% tax", func(t *testing.T) {
		purchaseDate := parseDate("2022-01-01")
		sellDate := parseDate("2022-06-01")
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(150)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, "500", tax.Gain.String())
		assert.Equal(t, "500", tax.Taxable.String())
		assert.True(t, decimal.NewFromInt(75).Equal(tax.ShortTerm), "short term should be 75, got %s", tax.ShortTerm)
		assert.True(t, tax.LongTerm.IsZero())
		assert.True(t, tax.Slab.IsZero())
	})

	t.Run("long term equity (holding > 1 year) has 10% tax", func(t *testing.T) {
		purchaseDate := parseDate("2020-01-01")
		sellDate := parseDate("2021-06-01")
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(200)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, "1000", tax.Gain.String())
		assert.Equal(t, "1000", tax.Taxable.String())
		assert.True(t, decimal.NewFromInt(100).Equal(tax.LongTerm), "long term should be 100, got %s", tax.LongTerm)
		assert.True(t, tax.ShortTerm.IsZero())
		assert.True(t, tax.Slab.IsZero())
	})

	t.Run("equity holding across leap year exactly 1 calendar year is short term", func(t *testing.T) {
		purchaseDate := parseDate("2024-01-01")
		sellDate := parseDate("2025-01-01")
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(200)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		// sold after 23 Jul 2024: 20% of 1000
		assert.True(t, decimal.NewFromInt(200).Equal(tax.ShortTerm), "held <= 1 calendar year should be short term, got %s", tax.ShortTerm)
		assert.True(t, tax.LongTerm.IsZero())
	})

	t.Run("equity holding across leap year exceeding 1 calendar year is long term", func(t *testing.T) {
		purchaseDate := parseDate("2024-01-01")
		sellDate := parseDate("2025-01-02")
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(200)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		// sold after 23 Jul 2024: 12.5% of 1000
		assert.True(t, decimal.NewFromInt(125).Equal(tax.LongTerm), "held > 1 calendar year should be long term, got %s", tax.LongTerm)
		assert.True(t, tax.ShortTerm.IsZero())
	})

	t.Run("long term gain sold before the long term tax began is exempt", func(t *testing.T) {
		purchaseDate := parseDate("2016-01-01")
		sellDate := parseDate("2018-03-15") // held over a year, before 2018-04-01
		qty := decimal.NewFromInt(10)

		tax := Calculate(db, qty, commodity, decimal.NewFromInt(100), purchaseDate, decimal.NewFromInt(200), sellDate)
		assert.Equal(t, "1000", tax.Gain.String())
		assert.True(t, tax.Taxable.IsZero())
		assert.True(t, tax.LongTerm.IsZero())
		assert.True(t, tax.ShortTerm.IsZero())
	})

	t.Run("short term gain before 2018 is still taxed", func(t *testing.T) {
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(100), parseDate("2017-12-01"), decimal.NewFromInt(200), parseDate("2018-01-15"))
		assert.Equal(t, "1000", tax.Taxable.String())
		assert.True(t, decimal.NewFromInt(150).Equal(tax.ShortTerm), "15%% of 1000, got %s", tax.ShortTerm)
	})

	// 31 Jan 2018 value used by the grandfathering rule.
	fmvDate := EquityGrandfatherDate.AddDate(0, 0, -1)
	seedFMV := func(t *testing.T, value int64) {
		t.Helper()
		db.Where("commodity_name = ?", "NIFTY50").Delete(&price.Price{})
		service.ClearPriceCache()
		require.NoError(t, db.Create(&price.Price{CommodityName: "NIFTY50", Date: fmvDate, Value: decimal.NewFromInt(value)}).Error)
	}

	t.Run("grandfathering steps the cost up to the 31 Jan 2018 value", func(t *testing.T) {
		seedFMV(t, 150)
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(100), parseDate("2017-01-01"), decimal.NewFromInt(250), parseDate("2020-01-01"))
		assert.Equal(t, "1500", tax.Gain.String())    // (250 - 100) * 10
		assert.Equal(t, "1000", tax.Taxable.String()) // (250 - 150) * 10
		assert.True(t, decimal.NewFromInt(100).Equal(tax.LongTerm), "10%% of 1000, got %s", tax.LongTerm)
	})

	t.Run("grandfathering is capped at the sale price and cannot create a loss", func(t *testing.T) {
		seedFMV(t, 300) // value on 31 Jan 2018 is above what it later sold for
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(100), parseDate("2017-01-01"), decimal.NewFromInt(250), parseDate("2020-01-01"))
		assert.True(t, tax.Taxable.IsZero(), "taxable should be 0, got %s", tax.Taxable)
		assert.True(t, tax.LongTerm.IsZero())
	})

	t.Run("grandfathering never lowers a higher actual cost", func(t *testing.T) {
		seedFMV(t, 150)
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(200), parseDate("2017-01-01"), decimal.NewFromInt(250), parseDate("2020-01-01"))
		assert.Equal(t, "500", tax.Taxable.String()) // (250 - 200) * 10, not (250 - 150) * 10
	})

	t.Run("a real loss is not inflated by the step up", func(t *testing.T) {
		seedFMV(t, 150)
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(120), parseDate("2017-01-01"), decimal.NewFromInt(100), parseDate("2020-01-01"))
		assert.Equal(t, "-200", tax.Gain.String())
		assert.Equal(t, "-200", tax.Taxable.String()) // deemed cost = min(150, 100) < 120 actual
	})

	t.Run("a missing 31 Jan 2018 price keeps the actual cost", func(t *testing.T) {
		db.Where("commodity_name = ?", "NIFTY50").Delete(&price.Price{})
		service.ClearPriceCache()
		tax := Calculate(db, decimal.NewFromInt(10), commodity, decimal.NewFromInt(100), parseDate("2017-01-01"), decimal.NewFromInt(250), parseDate("2020-01-01"))
		assert.Equal(t, "1500", tax.Taxable.String())
	})

	t.Run("rates follow the sale date: Budget 2024 raised them on 23 Jul 2024", func(t *testing.T) {
		qty, buy, sell := decimal.NewFromInt(10), decimal.NewFromInt(100), decimal.NewFromInt(200)
		longBefore := Calculate(db, qty, commodity, buy, parseDate("2022-01-01"), sell, parseDate("2024-07-22"))
		longAfter := Calculate(db, qty, commodity, buy, parseDate("2022-01-01"), sell, parseDate("2024-07-23"))
		assert.True(t, decimal.NewFromInt(100).Equal(longBefore.LongTerm), "10%% of 1000, got %s", longBefore.LongTerm)
		assert.True(t, decimal.NewFromInt(125).Equal(longAfter.LongTerm), "12.5%% of 1000, got %s", longAfter.LongTerm)

		shortBefore := Calculate(db, qty, commodity, buy, parseDate("2024-06-01"), sell, parseDate("2024-07-22"))
		shortAfter := Calculate(db, qty, commodity, buy, parseDate("2024-06-01"), sell, parseDate("2024-07-23"))
		assert.True(t, decimal.NewFromInt(150).Equal(shortBefore.ShortTerm), "15%% of 1000, got %s", shortBefore.ShortTerm)
		assert.True(t, decimal.NewFromInt(200).Equal(shortAfter.ShortTerm), "20%% of 1000, got %s", shortAfter.ShortTerm)
	})
}

func TestCalculateDebt(t *testing.T) {
	db := taxTestDB(t)

	// Seed CII table
	ciis := []*cii.CII{
		{FinancialYear: "2018-19", CostInflationIndex: 280},
		{FinancialYear: "2022-23", CostInflationIndex: 331},
	}
	require.NoError(t, cii.UpsertAll(db, ciis))

	commodity := config.Commodity{
		Name:        "DebtFund",
		TaxCategory: config.Debt,
	}

	t.Run("short term debt is taxed at slab rate", func(t *testing.T) {
		purchaseDate := parseDate("2021-01-01")
		sellDate := parseDate("2022-01-01") // < 3 years
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(120)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, decimal.NewFromInt(200), tax.Gain)
		assert.Equal(t, decimal.NewFromInt(200), tax.Taxable)
		assert.Equal(t, decimal.NewFromInt(200), tax.Slab)
		assert.Equal(t, decimal.Zero, tax.LongTerm)
	})

	t.Run("long term debt before revocation date gets indexation and 20% LTCG", func(t *testing.T) {
		purchaseDate := parseDate("2018-05-01") // FY 2018-19, index 280
		sellDate := parseDate("2022-05-01")     // FY 2022-23, index 331 (holding > 3 years, before 2023-04-01)
		qty := decimal.NewFromInt(100)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(150)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, decimal.NewFromInt(5000), tax.Gain)
		assert.True(t, tax.Taxable.LessThan(tax.Gain), "Taxable should be reduced by indexation")
		assert.True(t, tax.LongTerm.GreaterThan(decimal.Zero), "Long term tax should be non-zero")
		assert.Equal(t, decimal.Zero, tax.Slab)
	})

	t.Run("units bought on or after 1 Apr 2023 get no indexation and are taxed at slab", func(t *testing.T) {
		purchaseDate := parseDate("2023-05-01")
		sellDate := parseDate("2026-06-01") // held over 3 years
		qty := decimal.NewFromInt(100)

		tax := Calculate(db, qty, commodity, decimal.NewFromInt(100), purchaseDate, decimal.NewFromInt(150), sellDate)
		assert.Equal(t, decimal.NewFromInt(5000), tax.Gain)
		assert.Equal(t, decimal.NewFromInt(5000), tax.Taxable, "the whole gain is taxable, nothing is indexed")
		assert.Equal(t, decimal.NewFromInt(5000), tax.Slab)
		assert.Equal(t, decimal.Zero, tax.LongTerm)
	})
}

func TestGetScheduleAL(t *testing.T) {
	db := taxTestDB(t)

	posts := []posting.Posting{
		{Date: parseDate("2021-05-01"), Account: "Assets:Bank", Amount: decimal.NewFromInt(50000)},
		{Date: parseDate("2022-05-01"), Account: "Assets:Bank", Amount: decimal.NewFromInt(30000)},
	}
	require.NoError(t, db.Create(&posts).Error)

	scheduleALs := GetScheduleAL(db)
	assert.NotEmpty(t, scheduleALs)
}

func TestCapitalGainTotals(t *testing.T) {
	d := decimal.NewFromInt
	gains := map[string]CapitalGain{
		"Assets:Equity:A": {FY: map[string]FYCapitalGain{
			"2024-25": {Units: d(10), SellPrice: d(1000), PurchasePrice: d(400), Tax: Tax{Gain: d(600), Taxable: d(600), LongTerm: d(60)}},
			"2025-26": {Units: d(5), SellPrice: d(300), PurchasePrice: d(500), Tax: Tax{Gain: d(-200), Taxable: d(-200), LongTerm: d(-20)}},
		}},
		"Assets:Equity:B": {FY: map[string]FYCapitalGain{
			"2024-25": {Units: d(2), SellPrice: d(100), PurchasePrice: d(300), Tax: Tax{Gain: d(-200), Taxable: d(-200), LongTerm: d(-20)}},
		}},
	}

	totals := CapitalGainTotals(gains)

	t.Run("losses in one account offset gains in another", func(t *testing.T) {
		fy := totals["2024-25"]
		assert.Equal(t, "400", fy.Tax.Taxable.String())
		assert.Equal(t, "40", fy.Tax.LongTerm.String())
		assert.Equal(t, "12", fy.Units.String())
		assert.Equal(t, "1100", fy.SellPrice.String())
	})

	t.Run("a net loss owes no tax but is still reported", func(t *testing.T) {
		fy := totals["2025-26"]
		assert.Equal(t, "-200", fy.Tax.Taxable.String())
		assert.Equal(t, "-200", fy.Tax.Gain.String())
		assert.True(t, fy.Tax.LongTerm.IsZero(), "tax is never negative, got %s", fy.Tax.LongTerm)
		assert.True(t, fy.Tax.ShortTerm.IsZero())
	})
}
