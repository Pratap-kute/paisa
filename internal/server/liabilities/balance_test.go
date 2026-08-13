package liabilities

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

func liabilityTestDB(t *testing.T) *gorm.DB {
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

func liabilityPosting(account, commodity string, amt float64) posting.Posting {
	return posting.Posting{
		TransactionID: account,
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC),
		Account:       account,
		Commodity:     commodity,
		Quantity:      decimal.NewFromFloat(amt),
		Amount:        decimal.NewFromFloat(amt),
		MarketAmount:  decimal.NewFromFloat(amt),
	}
}

func TestComputeLiabilityBreakdown(t *testing.T) {
	db := liabilityTestDB(t)

	// In double-entry accounting:
	// Taking a loan: Liabilities:HomeLoan is -100,000 (drawn)
	// Repaying a loan principal: Liabilities:HomeLoan is +20,000 (repaid)
	// Interest expense: Expenses:Interest:HomeLoan is +5,000
	postings := []posting.Posting{
		liabilityPosting("Liabilities:HomeLoan", "INR", -100000),
		liabilityPosting("Liabilities:HomeLoan", "INR", 20000),
	}
	expenses := []posting.Posting{
		liabilityPosting("Expenses:Interest:HomeLoan", "INR", 5000),
	}

	breakdowns := computeBreakdown(db, postings, expenses)

	require.Contains(t, breakdowns, "Liabilities:HomeLoan")
	b := breakdowns["Liabilities:HomeLoan"]

	assert.Equal(t, "100000", b.DrawnAmount.String())
	assert.Equal(t, "25000", b.RepaidAmount.String())   // 20000 principal + 5000 interest expense
	assert.Equal(t, "80000", b.BalanceAmount.String())  // 100000 - 20000 principal remaining
	assert.Equal(t, "5000", b.InterestAmount.String())  // 80000 balance + 25000 repaid - 100000 drawn = 5000
}
