package server

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/internal/config"
	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func doctorPosting(account, commodity string, qty, amt float64) posting.Posting {
	return posting.Posting{
		TransactionID: account,
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
		Account:       account,
		Commodity:     commodity,
		Quantity:      decimal.NewFromFloat(qty),
		Amount:        decimal.NewFromFloat(amt),
		MarketAmount:  decimal.NewFromFloat(amt),
	}
}

func TestRuleAssetRegisterNonNegative(t *testing.T) {
	db := serverTestDB(t, false)

	t.Run("passes when balance is positive", func(t *testing.T) {
		p := doctorPosting("Assets:Checking:SBI", "INR", 100, 100)
		require.NoError(t, db.Create(&p).Error)

		errs := ruleAssetRegisterNonNegative(db)
		assert.Empty(t, errs)
	})

	t.Run("detects negative running balance", func(t *testing.T) {
		p := doctorPosting("Assets:Checking:HDFC", "INR", -50, -50)
		p.Date = time.Date(2024, time.January, 2, 0, 0, 0, 0, time.Local)
		require.NoError(t, db.Create(&p).Error)

		errs := ruleAssetRegisterNonNegative(db)
		require.Len(t, errs, 1)
		assert.Contains(t, errs[0].Error(), "negative")
	})
}

func TestRuleNonCreditAndNonDebitAccounts(t *testing.T) {
	db := serverTestDB(t, false)

	t.Run("ruleNonCreditAccount flags positive amount in Income", func(t *testing.T) {
		// In paisa, income is credited (negative amount). A positive amount is invalid credit entry flag
		p := doctorPosting("Income:Salary", "INR", 500, 500)
		require.NoError(t, db.Create(&p).Error)

		errs := ruleNonCreditAccount(db)
		require.Len(t, errs, 1)
		assert.Contains(t, errs[0].Error(), "Income:Salary")
	})

	t.Run("ruleNonDebitAccount flags negative amount in Expenses", func(t *testing.T) {
		// In paisa, expenses are debited (positive amount). A negative amount is invalid debit entry flag
		p := doctorPosting("Expenses:Groceries", "INR", -100, -100)
		require.NoError(t, db.Create(&p).Error)

		errs := ruleNonDebitAccount(db)
		require.Len(t, errs, 1)
		assert.Contains(t, errs[0].Error(), "Expenses:Groceries")
	})
}

func TestRuleAllocationTargetMissingAssetAccounts(t *testing.T) {
	db := serverTestDB(t, false)

	p := doctorPosting("Assets:Equity:UntrackedFund", "INR", 100, 100)
	require.NoError(t, db.Create(&p).Error)

	err := config.LoadConfig([]byte(`
journal_path: main.ledger
db_path: paisa.db
allocation_targets:
  - name: Equity
    target: 100
    accounts:
      - Assets:Equity:OtherFund
`), "")
	require.NoError(t, err)

	errs := ruleAllocationTargetMissingAssetAccounts(db)
	require.Len(t, errs, 1)
	assert.Contains(t, errs[0].Error(), "Assets:Equity:UntrackedFund")
}

func TestGetDiagnosis(t *testing.T) {
	db := serverTestDB(t, false)

	// Clean diagnosis on clean DB
	diagnosis := GetDiagnosis(db)
	issues, ok := diagnosis["issues"].([]Issue)
	require.True(t, ok)
	assert.Empty(t, issues)
}
