package taxation

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/internal/config"
	"github.com/ananthakumaran/paisa/internal/model/cii"
	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/ananthakumaran/paisa/internal/model/price"
	"github.com/ananthakumaran/paisa/internal/service"
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

	t.Run("sold before grandfather date is tax exempt", func(t *testing.T) {
		purchaseDate := parseDate("2017-01-01")
		sellDate := parseDate("2018-01-15") // before 2018-02-01
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100)
		sellPrice := decimal.NewFromInt(200)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, "1000", tax.Gain.String())
		assert.True(t, tax.Taxable.IsZero())
		assert.True(t, tax.LongTerm.IsZero())
		assert.True(t, tax.ShortTerm.IsZero())
	})

	t.Run("purchased before grandfather date steps up purchase price", func(t *testing.T) {
		// Seed price on 2018-02-01
		require.NoError(t, db.Create(&price.Price{
			CommodityName: "NIFTY50",
			Date:          EQUITY_GRANDFATHER_DATE,
			Value:         decimal.NewFromInt(150),
		}).Error)

		purchaseDate := parseDate("2017-01-01")
		sellDate := parseDate("2020-01-01")
		qty := decimal.NewFromInt(10)
		buyPrice := decimal.NewFromInt(100) // original buy price was 100
		sellPrice := decimal.NewFromInt(250)

		tax := Calculate(db, qty, commodity, buyPrice, purchaseDate, sellPrice, sellDate)
		assert.Equal(t, "1500", tax.Gain.String())                                                           // (250 - 100) * 10
		assert.Equal(t, "1000", tax.Taxable.String())                                                        // (250 - 150) * 10
		assert.True(t, decimal.NewFromInt(100).Equal(tax.LongTerm), "long term should be 100, got %s", tax.LongTerm) // 10% of 1000
	})
}

func TestCalculateDebt(t *testing.T) {
	db := taxTestDB(t)

	// Seed CII table
	ciis := []*cii.CII{
		{FinancialYear: "2018-19", CostInflationIndex: 280},
		{FinancialYear: "2022-23", CostInflationIndex: 331},
	}
	cii.UpsertAll(db, ciis)

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
}
