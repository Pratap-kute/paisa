package assets

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/internal/model/cache"
	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/ananthakumaran/paisa/internal/model/price"
	"github.com/ananthakumaran/paisa/internal/service"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func assetTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}, &price.Price{}, &cache.Cache{}))
	service.ClearPriceCache()
	service.ClearInterestCache()
	t.Cleanup(func() {
		service.ClearPriceCache()
		service.ClearInterestCache()
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

func assetPosting(account, commodity string, qty, amt float64) posting.Posting {
	return posting.Posting{
		TransactionID: account,
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC),
		Account:       account,
		Commodity:     commodity,
		Quantity:      decimal.NewFromFloat(qty),
		Amount:        decimal.NewFromFloat(amt),
		MarketAmount:  decimal.NewFromFloat(amt),
	}
}

func TestComputeBreakdown(t *testing.T) {
	db := assetTestDB(t)

	t.Run("investment account computes investment and balance", func(t *testing.T) {
		ps := []posting.Posting{
			assetPosting("Assets:Broker:AAPL", "AAPL", 10, 1000),
			assetPosting("Assets:Broker:AAPL", "AAPL", -2, -300),
		}

		got := ComputeBreakdown(db, ps, true, "Assets:Broker:AAPL")
		assert.Equal(t, "Assets:Broker:AAPL", got.Group)
		assert.Equal(t, "1000", got.InvestmentAmount.String())
		assert.Equal(t, "300", got.WithdrawalAmount.String())
		assert.Equal(t, "700", got.MarketAmount.String())
		assert.Equal(t, "8", got.BalanceUnits.String())
	})

	t.Run("checking account is not counted towards net investment", func(t *testing.T) {
		ps := []posting.Posting{
			assetPosting("Assets:Checking:SBI", "INR", 500, 500),
		}

		got := ComputeBreakdown(db, ps, true, "Assets:Checking:SBI")
		assert.True(t, got.InvestmentAmount.IsZero(), "Checking account should have 0 investmentAmount")
		assert.Equal(t, "500", got.MarketAmount.String())
	})
}

func TestComputeBreakdownsHierarchicalRollup(t *testing.T) {
	db := assetTestDB(t)

	postings := []posting.Posting{
		assetPosting("Assets:Checking:SBI", "INR", 100, 100),
		assetPosting("Assets:Equity:MutualFund", "MF1", 5, 500),
	}

	breakdowns := ComputeBreakdowns(db, postings, true)

	// Hierarchy should contain Assets, Assets:Checking, Assets:Checking:SBI, Assets:Equity, Assets:Equity:MutualFund
	assert.Contains(t, breakdowns, "Assets")
	assert.Contains(t, breakdowns, "Assets:Checking")
	assert.Contains(t, breakdowns, "Assets:Checking:SBI")
	assert.Contains(t, breakdowns, "Assets:Equity")
	assert.Contains(t, breakdowns, "Assets:Equity:MutualFund")

	assert.Equal(t, "600", breakdowns["Assets"].MarketAmount.String())
	assert.Equal(t, "100", breakdowns["Assets:Checking"].MarketAmount.String())
	assert.Equal(t, "500", breakdowns["Assets:Equity"].MarketAmount.String())
}
