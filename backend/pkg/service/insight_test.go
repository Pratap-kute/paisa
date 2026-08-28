package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupInsightTestDB(t *testing.T, cfg string) *gorm.DB {
	t.Helper()
	db := serviceTestDB(t)
	if cfg == "" {
		cfg = "journal_path: main.ledger\ndb_path: paisa.db\ndefault_currency: INR\n"
	}
	require.NoError(t, config.LoadConfig([]byte(cfg), ""))
	return db
}

func parseDate(s string) time.Time {
	t, _ := time.ParseInLocation("2006-01-02", s, config.TimeZone())
	return t
}

func TestInsight_EmptyDatabase(t *testing.T) {
	db := setupInsightTestDB(t, "")
	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)
	assert.Equal(t, "2026-08", res.Period)
	assert.Equal(t, "2026-07", res.ComparisonPeriod)
	assert.Empty(t, res.Insights)
}

func TestInsight_InvalidPeriod(t *testing.T) {
	db := setupInsightTestDB(t, "")
	_, err := GetInsights(db, "invalid-date")
	require.Error(t, err)
}

func TestInsight_ExpenseChangeDetector(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// July expenses: 50,000; August expenses: 60,000 (+20%)
	postings := []posting.Posting{
		{TransactionID: "t1", Date: parseDate("2026-07-10"), Account: "Expenses:Food", Amount: decimal.NewFromInt(50000)},
		{TransactionID: "t2", Date: parseDate("2026-08-10"), Account: "Expenses:Food", Amount: decimal.NewFromInt(60000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var expenseInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeExpenseChange {
			expenseInsight = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, expenseInsight)
	assert.Equal(t, "expense_change:2026-08", expenseInsight.ID)
	assert.True(t, decimal.NewFromInt(60000).Equal(*expenseInsight.Value))
	assert.True(t, decimal.NewFromInt(50000).Equal(*expenseInsight.PreviousValue))
	assert.True(t, decimal.NewFromInt(10000).Equal(*expenseInsight.Change))
	assert.True(t, decimal.NewFromInt(20).Equal(*expenseInsight.ChangePercent))
	assert.Equal(t, InsightSeverityWarning, expenseInsight.Severity)
}

func TestInsight_CategorySpikes(t *testing.T) {
	db := setupInsightTestDB(t, "")

	postings := []posting.Posting{
		// July
		{TransactionID: "t1", Date: parseDate("2026-07-05"), Account: "Expenses:Dining", Amount: decimal.NewFromInt(10000)},
		{TransactionID: "t2", Date: parseDate("2026-07-05"), Account: "Expenses:Groceries", Amount: decimal.NewFromInt(20000)},
		// August - Dining increased by 50%
		{TransactionID: "t3", Date: parseDate("2026-08-05"), Account: "Expenses:Dining:Restaurants", Amount: decimal.NewFromInt(15000)},
		{TransactionID: "t4", Date: parseDate("2026-08-05"), Account: "Expenses:Groceries", Amount: decimal.NewFromInt(20000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var diningSpike *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeCategorySpike && res.Insights[i].Account == "Expenses:Dining" {
			diningSpike = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, diningSpike)
	assert.Equal(t, "category_spike:2026-08:Expenses:Dining", diningSpike.ID)
	assert.True(t, decimal.NewFromInt(15000).Equal(*diningSpike.Value))
	assert.True(t, decimal.NewFromInt(10000).Equal(*diningSpike.PreviousValue))
	assert.True(t, decimal.NewFromInt(5000).Equal(*diningSpike.Change))
	assert.True(t, decimal.NewFromInt(50).Equal(*diningSpike.ChangePercent))
}

func TestInsight_SavingsRateChange(t *testing.T) {
	db := setupInsightTestDB(t, "")

	postings := []posting.Posting{
		// July: Salary 100k, Tax 10k -> Net Income 90k. Investment 36k -> Savings rate 40%
		{TransactionID: "j1", Date: parseDate("2026-07-01"), Account: "Income:Salary", Amount: decimal.NewFromInt(-100000)},
		{TransactionID: "j2", Date: parseDate("2026-07-01"), Account: "Expenses:Tax", Amount: decimal.NewFromInt(10000)},
		{TransactionID: "j3", Date: parseDate("2026-07-02"), Account: "Assets:MutualFunds", Amount: decimal.NewFromInt(36000), Commodity: "INR"},

		// August: Salary 100k, Tax 10k -> Net Income 90k. Investment 18k -> Savings rate 20% (-20 pp)
		{TransactionID: "a1", Date: parseDate("2026-08-01"), Account: "Income:Salary", Amount: decimal.NewFromInt(-100000)},
		{TransactionID: "a2", Date: parseDate("2026-08-01"), Account: "Expenses:Tax", Amount: decimal.NewFromInt(10000)},
		{TransactionID: "a3", Date: parseDate("2026-08-02"), Account: "Assets:MutualFunds", Amount: decimal.NewFromInt(18000), Commodity: "INR"},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var srInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeSavingsRateChange {
			srInsight = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, srInsight)
	assert.Equal(t, "savings_rate_change:2026-08", srInsight.ID)
	assert.True(t, decimal.NewFromInt(20).Equal(*srInsight.Value))
	assert.True(t, decimal.NewFromInt(40).Equal(*srInsight.PreviousValue))
	assert.True(t, decimal.NewFromInt(-20).Equal(*srInsight.Change))
	assert.Equal(t, InsightSeverityWarning, srInsight.Severity)
}

func TestInsight_NetworthChangeAndContribution(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// July 31: Investment 100k, Stock AAPL qty 10 price 100 -> NW = 100k
	// August 15: New investment 50k
	// August 20: AAPL price increases to 150 -> NW = 150k + 500 gain
	prices := []price.Price{
		{Date: parseDate("2026-07-01"), CommodityType: config.Stock, CommodityName: "AAPL", Value: decimal.NewFromInt(100)},
		{Date: parseDate("2026-08-15"), CommodityType: config.Stock, CommodityName: "AAPL", Value: decimal.NewFromInt(150)},
	}
	require.NoError(t, db.Create(&prices).Error)

	postings := []posting.Posting{
		{TransactionID: "t1", Date: parseDate("2026-07-15"), Account: "Assets:Stocks", Commodity: "AAPL", Quantity: decimal.NewFromInt(10), Amount: decimal.NewFromInt(1000)},
		{TransactionID: "t2", Date: parseDate("2026-08-10"), Account: "Assets:MutualFunds", Commodity: "INR", Amount: decimal.NewFromInt(50000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var nwInsight, contribInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeNetworthChange {
			nwInsight = &res.Insights[i]
		}
		if res.Insights[i].Type == InsightTypeNetworthContribution {
			contribInsight = &res.Insights[i]
		}
	}

	require.NotNil(t, nwInsight)
	assert.Equal(t, "networth_change:2026-08", nwInsight.ID)
	assert.True(t, nwInsight.Change.IsPositive())

	require.NotNil(t, contribInsight)
	assert.Equal(t, "networth_contribution:2026-08", contribInsight.ID)
	assert.NotNil(t, contribInsight.InvestmentContribution)
	assert.NotNil(t, contribInsight.GainContribution)
	// Δbalance == ΔnetInvestment + Δgain
	assert.True(t, nwInsight.Change.Equal(contribInsight.InvestmentContribution.Add(*contribInsight.GainContribution)))
}

func TestInsight_BudgetRiskAndOverspent(t *testing.T) {
	db := setupInsightTestDB(t, "")

	postings := []posting.Posting{
		// Forecast for Food 10,000, Actual 12,000 (Overspent)
		{TransactionID: "f1", Date: parseDate("2026-08-01"), Account: "Expenses:Food", Amount: decimal.NewFromInt(10000), Forecast: true},
		{TransactionID: "f2", Date: parseDate("2026-08-05"), Account: "Expenses:Food", Amount: decimal.NewFromInt(12000)},

		// Forecast for Utilities 10,000, Actual 9,000 (90% - Risk)
		{TransactionID: "u1", Date: parseDate("2026-08-01"), Account: "Expenses:Utilities", Amount: decimal.NewFromInt(10000), Forecast: true},
		{TransactionID: "u2", Date: parseDate("2026-08-05"), Account: "Expenses:Utilities", Amount: decimal.NewFromInt(9000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var overspent, risk *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeBudgetOverspent && res.Insights[i].Account == "Expenses:Food" {
			overspent = &res.Insights[i]
		}
		if res.Insights[i].Type == InsightTypeBudgetRisk && res.Insights[i].Account == "Expenses:Utilities" {
			risk = &res.Insights[i]
		}
	}

	require.NotNil(t, overspent)
	assert.Equal(t, InsightSeverityCritical, overspent.Severity)
	assert.True(t, decimal.NewFromInt(12000).Equal(*overspent.Value))
	assert.True(t, decimal.NewFromInt(2000).Equal(*overspent.Change))

	require.NotNil(t, risk)
	assert.Equal(t, InsightSeverityWarning, risk.Severity)
	assert.True(t, decimal.NewFromInt(90).Equal(*risk.ChangePercent))
}

func TestInsight_RecurringExpenseIncrease(t *testing.T) {
	db := setupInsightTestDB(t, "")

	postings := []posting.Posting{
		// Netflix July: ₹499
		{TransactionID: "n1", Date: parseDate("2026-07-15"), Account: "Expenses:Entertainment", Amount: decimal.NewFromInt(499), TagRecurring: "Netflix"},
		{TransactionID: "n1", Date: parseDate("2026-07-15"), Account: "Assets:Checking", Amount: decimal.NewFromInt(-499), TagRecurring: "Netflix"},

		// Netflix August: ₹649 (+30%)
		{TransactionID: "n2", Date: parseDate("2026-08-15"), Account: "Expenses:Entertainment", Amount: decimal.NewFromInt(649), TagRecurring: "Netflix"},
		{TransactionID: "n2", Date: parseDate("2026-08-15"), Account: "Assets:Checking", Amount: decimal.NewFromInt(-649), TagRecurring: "Netflix"},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var recurringInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeRecurringIncrease && res.Insights[i].Account == "Netflix" {
			recurringInsight = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, recurringInsight)
	assert.Equal(t, "recurring_increase:2026-08:Netflix", recurringInsight.ID)
	assert.True(t, decimal.NewFromInt(649).Equal(*recurringInsight.Value))
	assert.True(t, decimal.NewFromInt(499).Equal(*recurringInsight.PreviousValue))
	assert.True(t, decimal.NewFromInt(150).Equal(*recurringInsight.Change))
}

func TestInsight_NetworthFirstOfMonthInvestment(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// Investment made on the 1st of August
	postings := []posting.Posting{
		{TransactionID: "inv1", Date: parseDate("2026-07-15"), Account: "Assets:MF", Commodity: "INR", Amount: decimal.NewFromInt(100000)},
		{TransactionID: "inv2", Date: parseDate("2026-08-01"), Account: "Assets:MF", Commodity: "INR", Amount: decimal.NewFromInt(25000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var nwInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeNetworthChange {
			nwInsight = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, nwInsight, "August 1st investment must produce net worth change insight")
	// The change should be +25,000 (125,000 vs 100,000 baseline at July 31)
	assert.True(t, decimal.NewFromInt(25000).Equal(*nwInsight.Change), "Change should be 25,000, got: %s", nwInsight.Change)
	assert.True(t, decimal.NewFromInt(125000).Equal(*nwInsight.Value))
	assert.True(t, decimal.NewFromInt(100000).Equal(*nwInsight.PreviousValue))
}

func TestInsight_HistoricalBudgetOverspendWithoutRollover(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// Historical month 2026-06 (where Available is zeroed in budget service when rollover=false)
	postings := []posting.Posting{
		{TransactionID: "b1", Date: parseDate("2026-06-01"), Account: "Expenses:Shopping", Amount: decimal.NewFromInt(10000), Forecast: true},
		{TransactionID: "b2", Date: parseDate("2026-06-15"), Account: "Expenses:Shopping", Amount: decimal.NewFromInt(16000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-06")
	require.NoError(t, err)

	var overspent *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeBudgetOverspent && res.Insights[i].Account == "Expenses:Shopping" {
			overspent = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, overspent, "Historical budget overspending must be detected even without rollover")
	assert.Equal(t, InsightSeverityCritical, overspent.Severity)
	assert.True(t, decimal.NewFromInt(16000).Equal(*overspent.Value))
	assert.True(t, decimal.NewFromInt(10000).Equal(*overspent.PreviousValue))
	assert.True(t, decimal.NewFromInt(6000).Equal(*overspent.Change))
}

func TestInsight_ZeroIncomeSuppressesSavingsRateAlert(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// July had income & 40% savings rate; August has NO income yet
	postings := []posting.Posting{
		{TransactionID: "j1", Date: parseDate("2026-07-01"), Account: "Income:Salary", Amount: decimal.NewFromInt(-100000)},
		{TransactionID: "j2", Date: parseDate("2026-07-02"), Account: "Assets:MF", Amount: decimal.NewFromInt(40000), Commodity: "INR"},
		// August has an expense but no income
		{TransactionID: "a1", Date: parseDate("2026-08-01"), Account: "Expenses:Food", Amount: decimal.NewFromInt(5000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	for i := range res.Insights {
		assert.NotEqual(t, InsightTypeSavingsRateChange, res.Insights[i].Type, "Should not emit savings_rate_change when current income is 0")
	}
}

func TestInsight_HistoricalPeriodSkipsTodayOnlyDetectors(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// Today has negative checking balance
	postings := []posting.Posting{
		{TransactionID: "c1", Date: parseDate("2026-08-01"), Account: "Assets:Checking", Amount: decimal.NewFromInt(-10000), Commodity: "INR"},
		{TransactionID: "e1", Date: parseDate("2026-05-10"), Account: "Expenses:Food", Amount: decimal.NewFromInt(5000)},
	}
	require.NoError(t, db.Create(&postings).Error)

	// Querying historical month 2026-05 must NOT emit today's cash warning
	res, err := GetInsights(db, "2026-05")
	require.NoError(t, err)

	for i := range res.Insights {
		assert.NotEqual(t, InsightTypeCashWarning, res.Insights[i].Type, "Historical months should not emit cash warnings based on today's balance")
		assert.NotEqual(t, InsightTypeAllocationConcentration, res.Insights[i].Type, "Historical months should not emit allocation warnings based on today's prices")
	}
}

func TestInsight_AllocationConcentration(t *testing.T) {
	cfg := `journal_path: main.ledger
db_path: paisa.db
default_currency: INR
allocation_targets:
  - name: Equity
    target: 50
    accounts:
      - "Assets:Stocks:*"
`
	db := setupInsightTestDB(t, cfg)

	postings := []posting.Posting{
		// Stocks: 70k, Debt: 30k -> Equity = 70% (target 50%, dev +20pp)
		{TransactionID: "s1", Date: parseDate("2026-08-01"), Account: "Assets:Stocks:AAPL", Amount: decimal.NewFromInt(70000), Commodity: "INR"},
		{TransactionID: "s2", Date: parseDate("2026-08-01"), Account: "Assets:Debt:Bonds", Amount: decimal.NewFromInt(30000), Commodity: "INR"},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var allocInsight *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeAllocationConcentration {
			allocInsight = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, allocInsight)
	assert.Equal(t, "allocation_concentration:Equity", allocInsight.ID)
	assert.True(t, decimal.NewFromInt(70).Equal(*allocInsight.Value))
	assert.True(t, decimal.NewFromInt(50).Equal(*allocInsight.PreviousValue))
	assert.True(t, decimal.NewFromInt(20).Equal(*allocInsight.Change))
}

func TestInsight_CashWarning(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// Overdrawn checking balance: -5,000
	postings := []posting.Posting{
		{TransactionID: "c1", Date: parseDate("2026-08-01"), Account: "Assets:Checking:HDFC", Amount: decimal.NewFromInt(-5000), Commodity: "INR"},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	var cashWarning *Insight
	for i := range res.Insights {
		if res.Insights[i].Type == InsightTypeCashWarning && res.Insights[i].ID == "cash_warning:negative_checking" {
			cashWarning = &res.Insights[i]
			break
		}
	}

	require.NotNil(t, cashWarning)
	assert.Equal(t, InsightSeverityCritical, cashWarning.Severity)
	assert.Equal(t, 100, cashWarning.Score)
}

func TestInsight_RankingAndDeduplication(t *testing.T) {
	db := setupInsightTestDB(t, "")

	// Create conditions for:
	// 1. Cash warning (Score 100)
	// 2. Budget overspent on Food (Score 85)
	// 3. Category spike on Groceries (Score ~60)
	postings := []posting.Posting{
		{TransactionID: "c1", Date: parseDate("2026-08-01"), Account: "Assets:Checking", Amount: decimal.NewFromInt(-1000), Commodity: "INR"},
		{TransactionID: "f1", Date: parseDate("2026-08-01"), Account: "Expenses:Food", Amount: decimal.NewFromInt(1000), Forecast: true},
		{TransactionID: "f2", Date: parseDate("2026-08-05"), Account: "Expenses:Food", Amount: decimal.NewFromInt(2500)},
	}
	require.NoError(t, db.Create(&postings).Error)

	res, err := GetInsights(db, "2026-08")
	require.NoError(t, err)

	require.GreaterOrEqual(t, len(res.Insights), 3)
	// First insight should be highest score (Cash Warning Negative Checking = 100)
	assert.Equal(t, "cash_warning:negative_checking", res.Insights[0].ID)
	// Second insight should be Cash Warning Budget Deficit (90)
	assert.Equal(t, "cash_warning:budget_deficit:2026-08", res.Insights[1].ID)
	// Third insight should be Budget Overspent (85)
	assert.Equal(t, "budget_overspent:2026-08:Expenses:Food", res.Insights[2].ID)

	// Ensure sorted strictly descending by Score
	for i := 0; i < len(res.Insights)-1; i++ {
		assert.GreaterOrEqual(t, res.Insights[i].Score, res.Insights[i+1].Score,
			fmt.Sprintf("Insight at %d (%d) should be >= insight at %d (%d)", i, res.Insights[i].Score, i+1, res.Insights[i+1].Score))
	}
}
