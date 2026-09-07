package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func diagnosisPost(id, date, account, commodity string, qty, amt float64) posting.Posting {
	d, _ := time.ParseInLocation("2006-01-02", date, config.TimeZone())
	return posting.Posting{
		TransactionID: id,
		Date:          d,
		Account:       account,
		Commodity:     commodity,
		Quantity:      decimal.NewFromFloat(qty),
		Amount:        decimal.NewFromFloat(amt),
		MarketAmount:  decimal.NewFromFloat(amt),
	}
}

func TestDiagnosisCleanLedger(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)

	// Create 6 months of healthy history with checking, salary, groceries, and an investment
	ps := []posting.Posting{
		diagnosisPost("init", "2026-01-01", "Assets:Checking", "INR", 100000, 100000),
	}
	for m := 3; m <= 8; m++ {
		date := fmt.Sprintf("2026-%02d-15", m)
		ps = append(ps,
			diagnosisPost(fmt.Sprintf("sal-%d", m), date, "Income:Salary", "INR", -50000, -50000),
			diagnosisPost(fmt.Sprintf("exp-%d", m), date, "Expenses:Groceries", "INR", 20000, 20000),
		)
	}
	require.NoError(t, db.Create(&ps).Error)

	result := GetDiagnosis(db)
	assert.Equal(t, 11, result.Summary.TotalChecks)
	assert.Equal(t, 11, len(result.Checks))

	// All checks should pass or be informational (first-time investor is info)
	assert.Equal(t, 0, result.Summary.Danger)
	assert.Equal(t, 0, result.Summary.Warning)
	for _, check := range result.Checks {
		assert.NotEqual(t, CheckStatusFailed, check.Status)
	}
}

func TestDiagnosisAssetBalanceIntegrity(t *testing.T) {
	db := serviceTestDB(t)

	p := diagnosisPost("tx-1", "2026-01-01", "Assets:Checking", "INR", -500, -500)
	require.NoError(t, db.Create(&p).Error)

	issues, err := checkAssetBalanceIntegrity(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "negative_asset_balance", issues[0].Code)
	assert.Equal(t, LevelDanger, issues[0].Level)
	assert.Equal(t, CategoryLedger, issues[0].Category)
	assert.Equal(t, "Assets:Checking", issues[0].Entity.ID)
	assert.Contains(t, issues[0].AffectedFeatures, "Net Worth")
}

func TestDiagnosisPostingDirection(t *testing.T) {
	db := serviceTestDB(t)

	// Invalid positive amount in Income
	p1 := diagnosisPost("tx-inc", "2026-01-01", "Income:Consulting", "INR", 500, 500)
	// Invalid negative amount in Expenses
	p2 := diagnosisPost("tx-exp", "2026-01-02", "Expenses:Dining", "INR", -150, -150)
	require.NoError(t, db.Create(&[]posting.Posting{p1, p2}).Error)

	issues, err := checkPostingDirection(db)
	require.NoError(t, err)
	require.Len(t, issues, 2)

	assert.Equal(t, "invalid_income_direction", issues[0].Code)
	assert.Equal(t, LevelDanger, issues[0].Level)
	assert.Equal(t, "Income:Consulting", issues[0].Entity.ID)

	assert.Equal(t, "invalid_expense_direction", issues[1].Code)
	assert.Equal(t, LevelDanger, issues[1].Level)
	assert.Equal(t, "Expenses:Dining", issues[1].Entity.ID)
}

func TestDiagnosisExchangePriceCoverage(t *testing.T) {
	db := serviceTestDB(t)

	// Clean posting with domestic currency commodity
	p := diagnosisPost("clean", "2026-02-01", "Assets:Bank", "INR", 100, 100)
	require.NoError(t, db.Create(&p).Error)

	issues, err := checkExchangePriceCoverage(db)
	require.NoError(t, err)
	assert.Empty(t, issues)
}

func TestDiagnosisJournalPriceConsistency(t *testing.T) {
	db := serviceTestDB(t)

	d, _ := time.ParseInLocation("2006-01-02", "2026-03-01", config.TimeZone())
	require.NoError(t, db.Create(&price.Price{
		Date:          d,
		CommodityType: config.Stock,
		CommodityName: "INFY",
		Value:         decimal.NewFromInt(1500),
	}).Error)

	// Journal uses unit price 1400, differing by 100 (> 0.0001)
	p := posting.Posting{
		TransactionID: "buy-infy",
		Date:          d,
		Account:       "Assets:Investments:INFY",
		Commodity:     "INFY",
		Quantity:      decimal.NewFromInt(10),
		Amount:        decimal.NewFromInt(14000), // unit price = 1400
	}
	require.NoError(t, db.Create(&p).Error)

	issues, err := checkJournalPriceConsistency(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "journal_price_mismatch", issues[0].Code)
	assert.Equal(t, LevelWarning, issues[0].Level)
	assert.Equal(t, "INFY", issues[0].Entity.ID)
}

func TestDiagnosisAllocationConfiguration(t *testing.T) {
	db := serviceTestDB(t)

	p := diagnosisPost("alloc", "2026-01-01", "Assets:Equity:UnmappedFund", "INR", 1000, 1000)
	require.NoError(t, db.Create(&p).Error)

	require.NoError(t, config.LoadConfig([]byte(`
journal_path: main.ledger
db_path: paisa.db
allocation_targets:
  - name: TargetA
    target: 100
    accounts:
      - Assets:Equity:MappedFund
`), ""))

	issues, err := checkAllocationConfiguration(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "allocation_target_missing_account", issues[0].Code)
	assert.Equal(t, LevelWarning, issues[0].Level)
	assert.Contains(t, issues[0].Details, "Assets:Equity:UnmappedFund")
}

func TestDiagnosisCurrentValuationQualityFallback(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)

	// Buy a stock with no market price in DB -> trade fallback
	p := diagnosisPost("tx-stock", "2026-08-01", "Assets:Stocks", "TATAMOTORS", 10, 10000)
	require.NoError(t, db.Create(&p).Error)

	issues, err := checkCurrentValuationQuality(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "valuation_fallback", issues[0].Code)
	assert.Equal(t, LevelWarning, issues[0].Level)
	assert.Equal(t, "TATAMOTORS", issues[0].Entity.ID)
	assert.Contains(t, issues[0].Details, "Current portfolio valuation")
	assert.Contains(t, issues[0].AffectedFeatures, "Net Worth")
	assert.Contains(t, issues[0].AffectedFeatures, "Scenario Planning")
}

func TestDiagnosisInvestmentAttribution(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)

	// Dividend income received into checking with no investment account in the transaction
	d, _ := time.ParseInLocation("2006-01-02", "2026-05-10", config.TimeZone())
	tx := []posting.Posting{
		{TransactionID: "div-1", Date: d, Account: "Assets:Checking", Commodity: "INR", Amount: decimal.NewFromInt(500), Quantity: decimal.NewFromInt(500)},
		{TransactionID: "div-1", Date: d, Account: "Income:Dividend", Commodity: "INR", Amount: decimal.NewFromInt(-500), Quantity: decimal.NewFromInt(-500)},
		// Add an investment holding so portfolio is active
		{TransactionID: "inv-1", Date: d.AddDate(0, -1, 0), Account: "Assets:MutualFunds", Commodity: "NIFTY", Amount: decimal.NewFromInt(5000), Quantity: decimal.NewFromInt(50)},
	}
	require.NoError(t, db.Create(&tx).Error)

	issues, err := checkInvestmentIncomeAttribution(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "unattributed_investment_income", issues[0].Code)
	assert.Equal(t, LevelWarning, issues[0].Level)
	assert.Equal(t, CategoryInvestments, issues[0].Category)
	assert.Contains(t, issues[0].Details, "2026-05-10")
}

func TestDiagnosisScenarioHistoryReadiness(t *testing.T) {
	t.Run("first-time investor is info and suppresses contribution history warning", func(t *testing.T) {
		db := serviceTestDB(t)
		utils.SetNow("2026-09-07")
		t.Cleanup(utils.ResetNow)

		ps := []posting.Posting{
			diagnosisPost("init", "2026-01-01", "Assets:Checking", "INR", 100000, 100000),
		}
		// 6 months of historical income and expenses
		for m := 3; m <= 8; m++ {
			date := fmt.Sprintf("2026-%02d-15", m)
			ps = append(ps,
				diagnosisPost(fmt.Sprintf("sal-%d", m), date, "Income:Salary", "INR", -50000, -50000),
				diagnosisPost(fmt.Sprintf("exp-%d", m), date, "Expenses:Groceries", "INR", 20000, 20000),
			)
		}
		require.NoError(t, db.Create(&ps).Error)

		issues, err := checkScenarioHistoryReadiness(db)
		require.NoError(t, err)
		require.Len(t, issues, 1)
		assert.Equal(t, "no_investment_activity", issues[0].Code)
		assert.Equal(t, LevelInfo, issues[0].Level)
		assert.Equal(t, CategoryHistory, issues[0].Category)
		assert.Contains(t, issues[0].Description, "₹0 as your baseline monthly investment transfer")

		// Must NOT emit insufficient_contribution_history
		for _, issue := range issues {
			assert.NotEqual(t, "insufficient_contribution_history", issue.Code)
		}
	})

	t.Run("partial history 1-5 months is info", func(t *testing.T) {
		db := serviceTestDB(t)
		utils.SetNow("2026-09-07")
		t.Cleanup(utils.ResetNow)

		ps := []posting.Posting{
			diagnosisPost("init", "2026-01-01", "Assets:Checking", "INR", 100000, 100000),
		}
		// Only 3 completed months
		for m := 6; m <= 8; m++ {
			date := fmt.Sprintf("2026-%02d-15", m)
			ps = append(ps,
				diagnosisPost(fmt.Sprintf("sal-%d", m), date, "Income:Salary", "INR", -50000, -50000),
				diagnosisPost(fmt.Sprintf("exp-%d", m), date, "Expenses:Groceries", "INR", 20000, 20000),
			)
		}
		require.NoError(t, db.Create(&ps).Error)

		issues, err := checkScenarioHistoryReadiness(db)
		require.NoError(t, err)

		foundIncome := false
		foundExpense := false
		for _, issue := range issues {
			if issue.Code == "insufficient_income_history" {
				foundIncome = true
				assert.Equal(t, LevelInfo, issue.Level)
				assert.Contains(t, issue.Description, "3 completed months")
			}
			if issue.Code == "insufficient_expense_history" {
				foundExpense = true
				assert.Equal(t, LevelInfo, issue.Level)
			}
		}
		assert.True(t, foundIncome)
		assert.True(t, foundExpense)
	})

	t.Run("zero historical samples is warning", func(t *testing.T) {
		db := serviceTestDB(t)
		utils.SetNow("2026-09-07")
		t.Cleanup(utils.ResetNow)

		// Checking account only, zero income and zero expenses
		ps := []posting.Posting{
			diagnosisPost("init", "2026-01-01", "Assets:Checking", "INR", 100000, 100000),
		}
		require.NoError(t, db.Create(&ps).Error)

		issues, err := checkScenarioHistoryReadiness(db)
		require.NoError(t, err)

		var incomeIssue *QualityIssue
		for i := range issues {
			if issues[i].Code == "insufficient_income_history" {
				incomeIssue = &issues[i]
			}
		}
		require.NotNil(t, incomeIssue)
		assert.Equal(t, LevelWarning, incomeIssue.Level)
		assert.Equal(t, "No Historical Income Data", incomeIssue.Summary)
	})
}

func TestDiagnosisScenarioCheckingReadiness(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)

	// Only investment posting, no Assets:Checking
	ps := []posting.Posting{
		diagnosisPost("inv", "2026-05-01", "Assets:MutualFunds", "NIFTY", 100, 10000),
	}
	require.NoError(t, db.Create(&ps).Error)

	issues, err := checkScenarioCheckingReadiness(db)
	require.NoError(t, err)
	require.Len(t, issues, 1)
	assert.Equal(t, "no_checking_account", issues[0].Code)
	assert.Equal(t, LevelWarning, issues[0].Level)
	assert.Equal(t, CategoryConfiguration, issues[0].Category)
	assert.Equal(t, "Assets:Checking", issues[0].Entity.ID)
}

func TestDiagnosisDeterministicOrdering(t *testing.T) {
	issues := []QualityIssue{
		{Code: "c_info", Level: LevelInfo, Category: CategoryHistory, Summary: "Info 1"},
		{Code: "a_danger", Level: LevelDanger, Category: CategoryLedger, Summary: "Danger 1"},
		{Code: "b_warning", Level: LevelWarning, Category: CategoryValuation, Summary: "Warning 1"},
		{Code: "d_warning", Level: LevelWarning, Category: CategoryAllocation, Summary: "Warning 2"},
	}

	sortIssues(issues)

	assert.Equal(t, LevelDanger, issues[0].Level)
	assert.Equal(t, LevelWarning, issues[1].Level)
	assert.Equal(t, LevelWarning, issues[2].Level)
	assert.Equal(t, LevelInfo, issues[3].Level)
}

func TestDiagnosisPanicIsolation(t *testing.T) {
	db := serviceTestDB(t)

	panickingCheck := func(db *gorm.DB) ([]QualityIssue, error) {
		panic("unexpected runtime error in check")
	}

	issues, err := runSafeCheck(db, panickingCheck)
	assert.Empty(t, issues)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "panicked")
}
