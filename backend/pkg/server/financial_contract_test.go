package server

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	modelCache "github.com/ananthakumaran/paisa/pkg/model/cache"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupContractTestDB(t *testing.T, configYAML string) *gorm.DB {
	t.Helper()
	fullYAML := configYAML
	if fullYAML == "" {
		fullYAML = "journal_path: main.ledger\ndb_path: paisa.db\ndefault_currency: INR\n"
	} else if !strings.Contains(fullYAML, "journal_path:") {
		fullYAML = fmt.Sprintf("journal_path: main.ledger\ndb_path: paisa.db\ndefault_currency: INR\n%s", configYAML)
	}
	require.NoError(t, config.LoadConfig([]byte(fullYAML), ""))
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}, &price.Price{}, &modelCache.Cache{}))

	accounting.ClearCache()
	service.ClearPriceCache()
	service.ClearInterestCache()
	transaction.ClearCache()

	t.Cleanup(func() {
		accounting.ClearCache()
		service.ClearPriceCache()
		service.ClearInterestCache()
		transaction.ClearCache()
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func contractPosting(date time.Time, account, commodity, quantity, amount string) posting.Posting {
	return posting.Posting{
		TransactionID: fmt.Sprintf("txn-%s-%s", account, amount),
		Date:          date,
		Account:       account,
		Commodity:     commodity,
		Quantity:      decimal.RequireFromString(quantity),
		Amount:        decimal.RequireFromString(amount),
		MarketAmount:  decimal.RequireFromString(amount),
	}
}

// Scenario A: Salary
// Income:Salary:* has negative postings, Assets:Checking has positive postings.
// Verifies gross income, net income, cash flow, and checking balance calculations.
func TestContract_ScenarioA_Salary(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 15, 0, 0, 0, 0, time.Local)

	postings := []*posting.Posting{
		{
			TransactionID: "salary-1", Date: d, Account: "Income:Salary:Acme",
			Commodity: "INR", Quantity: decimal.RequireFromString("-50000"),
			Amount: decimal.RequireFromString("-50000"), MarketAmount: decimal.RequireFromString("-50000"),
		},
		{
			TransactionID: "salary-1", Date: d, Account: "Assets:Checking:Bank",
			Commodity: "INR", Quantity: decimal.RequireFromString("50000"),
			Amount: decimal.RequireFromString("50000"), MarketAmount: decimal.RequireFromString("50000"),
		},
	}
	for _, p := range postings {
		require.NoError(t, db.Create(p).Error)
	}

	// 1. Income Endpoint / computeIncomeYearlyCard
	incomeData := GetIncome(db)
	yearlyCards := incomeData.YearlyCards
	require.NotEmpty(t, yearlyCards)
	assert.Equal(t, "50000", yearlyCards[0].GrossIncome.String())
	assert.Equal(t, "50000", yearlyCards[0].NetIncome.String())
	assert.Equal(t, "0", yearlyCards[0].NetTax.String())

	// 2. Cash Flow
	cf := service.ComputeCashFlow(query.Init(db), decimal.Zero)
	require.Len(t, cf, 2) // Jan and Feb 2024
	assert.Equal(t, "50000", cf[0].Income.String())
	assert.Equal(t, "50000", cf[0].Checking.String())
	assert.Equal(t, "50000", cf[0].Balance.String())

	// 3. Networth Endpoint (Asset postings participate in networth)
	nwData := GetCurrentNetworth(db)
	nw := nwData.Networth
	assert.Equal(t, "50000", nw.InvestmentAmount.String())
	assert.Equal(t, "50000", nw.BalanceAmount.String())
}

// Scenario B: Expense
// Assets:Checking negative, Expenses:* positive.
func TestContract_ScenarioB_Expense(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 20, 0, 0, 0, 0, time.Local)

	postings := []*posting.Posting{
		{
			TransactionID: "rent-1", Date: d, Account: "Assets:Checking:Bank",
			Commodity: "INR", Quantity: decimal.RequireFromString("-2000"),
			Amount: decimal.RequireFromString("-2000"), MarketAmount: decimal.RequireFromString("-2000"),
		},
		{
			TransactionID: "rent-1", Date: d, Account: "Expenses:Rent",
			Commodity: "INR", Quantity: decimal.RequireFromString("2000"),
			Amount: decimal.RequireFromString("2000"), MarketAmount: decimal.RequireFromString("2000"),
		},
	}
	for _, p := range postings {
		require.NoError(t, db.Create(p).Error)
	}

	cf := service.ComputeCashFlow(query.Init(db), decimal.Zero)
	require.NotEmpty(t, cf)
	assert.Equal(t, "2000", cf[0].Expenses.String())
	assert.Equal(t, "-2000", cf[0].Checking.String())
	assert.Equal(t, "-2000", cf[0].Balance.String())
}

// Scenario C: Asset-to-asset transfer
// Assets:Checking -10000, Assets:Equity:NIFTY +10000.
// Must be categorized as investment, NOT expense.
func TestContract_ScenarioC_AssetTransfer(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 10, 0, 0, 0, 0, time.Local)

	postings := []*posting.Posting{
		{
			TransactionID: "inv-1", Date: d, Account: "Assets:Checking:Bank",
			Commodity: "INR", Quantity: decimal.RequireFromString("-10000"),
			Amount: decimal.RequireFromString("-10000"), MarketAmount: decimal.RequireFromString("-10000"),
		},
		{
			TransactionID: "inv-1", Date: d, Account: "Assets:Equity:NIFTY",
			Commodity: "INR", Quantity: decimal.RequireFromString("10000"),
			Amount: decimal.RequireFromString("10000"), MarketAmount: decimal.RequireFromString("10000"),
		},
	}
	for _, p := range postings {
		require.NoError(t, db.Create(p).Error)
	}

	cf := service.ComputeCashFlow(query.Init(db), decimal.Zero)
	require.NotEmpty(t, cf)
	assert.Equal(t, "0", cf[0].Expenses.String(), "Asset transfer must not be an expense")
	assert.Equal(t, "10000", cf[0].Investment.String(), "Must be categorized as investment")
	assert.Equal(t, "-10000", cf[0].Checking.String())
}

// Scenario D: Liability-related transaction
// Preserves liability sign conventions and calculation behavior.
func TestContract_ScenarioD_Liability(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 5, 0, 0, 0, 0, time.Local)

	postings := []*posting.Posting{
		{
			TransactionID: "loan-1", Date: d, Account: "Liabilities:Loan:Car",
			Commodity: "INR", Quantity: decimal.RequireFromString("-50000"),
			Amount: decimal.RequireFromString("-50000"), MarketAmount: decimal.RequireFromString("-50000"),
		},
		{
			TransactionID: "loan-1", Date: d, Account: "Assets:Checking:Bank",
			Commodity: "INR", Quantity: decimal.RequireFromString("50000"),
			Amount: decimal.RequireFromString("50000"), MarketAmount: decimal.RequireFromString("50000"),
		},
	}
	for _, p := range postings {
		require.NoError(t, db.Create(p).Error)
	}

	cf := service.ComputeCashFlow(query.Init(db), decimal.Zero)
	require.NotEmpty(t, cf)
	assert.Equal(t, "50000", cf[0].Liabilities.String())
	assert.Equal(t, "50000", cf[0].Checking.String())
}

// Scenario E: Interest
// Income:Interest:* has special return treatment in service layer.
func TestContract_ScenarioE_Interest(t *testing.T) {
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 15, 0, 0, 0, 0, time.Local)

	intPosting := posting.Posting{
		TransactionID: "int-1", Date: d, Account: "Income:Interest:Bank:Savings",
		Commodity: "INR", Amount: decimal.RequireFromString("-500"), MarketAmount: decimal.RequireFromString("-500"),
		Payee: "Bank Interest",
	}
	require.NoError(t, db.Create(&intPosting).Error)

	assetPosting := posting.Posting{
		TransactionID: "int-1", Date: d, Account: "Assets:Checking:Bank",
		Commodity: "INR", Amount: decimal.RequireFromString("500"), MarketAmount: decimal.RequireFromString("500"),
		Payee: "Bank Interest",
	}

	assert.True(t, service.IsInterest(db, assetPosting), "Interest counter-posting to Asset must be recognized by service.IsInterest")
}

// Scenario F: Capital gains
// Income:CapitalGains:* + corresponding Asset postings preserve return/gain semantics.
func TestContract_ScenarioF_CapitalGains(t *testing.T) {
	p := posting.Posting{Account: "Income:CapitalGains:Equity:Broker", Amount: decimal.RequireFromString("-1000")}
	assert.True(t, service.IsCapitalGains(p), "Income:CapitalGains account must be recognized by service.IsCapitalGains")
	assert.Equal(t, "Assets:Equity:Broker", service.CapitalGainsSourceAccount(p.Account))
}

// Scenario G: Tax expense
// Expenses:Tax has special meaning for Net Income / Savings Rate.
func TestContract_ScenarioG_TaxExpense(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 15, 0, 0, 0, 0, time.Local)

	postings := []*posting.Posting{
		{
			TransactionID: "sal-1", Date: d, Account: "Income:Salary:Acme",
			Commodity: "INR", Quantity: decimal.RequireFromString("-100000"),
			Amount: decimal.RequireFromString("-100000"), MarketAmount: decimal.RequireFromString("-100000"),
		},
		{
			TransactionID: "sal-1", Date: d, Account: "Expenses:Tax:IncomeTax",
			Commodity: "INR", Quantity: decimal.RequireFromString("15000"),
			Amount: decimal.RequireFromString("15000"), MarketAmount: decimal.RequireFromString("15000"),
		},
		{
			TransactionID: "sal-1", Date: d, Account: "Assets:Checking:Bank",
			Commodity: "INR", Quantity: decimal.RequireFromString("85000"),
			Amount: decimal.RequireFromString("85000"), MarketAmount: decimal.RequireFromString("85000"),
		},
	}
	for _, p := range postings {
		require.NoError(t, db.Create(p).Error)
	}

	incomeData := GetIncome(db)
	yearlyCards := incomeData.YearlyCards
	require.NotEmpty(t, yearlyCards)
	assert.Equal(t, "100000", yearlyCards[0].GrossIncome.String())
	assert.Equal(t, "15000", yearlyCards[0].NetTax.String())
	assert.Equal(t, "85000", yearlyCards[0].NetIncome.String(), "Net Income must equal GrossIncome - NetTax")
}

// Scenario H: Budget rollover & child rollup
// Verifies rollover enabled vs disabled, and child expense inclusion in parent budget.
func TestContract_ScenarioH_BudgetRolloverAndChildRollup(t *testing.T) {
	utils.SetNow("2024-02-15")

	t.Run("child expense rolled up to parent forecast", func(t *testing.T) {
		db := setupContractTestDB(t, "budget:\n  rollover: yes\n")
		d := time.Date(2024, time.February, 1, 0, 0, 0, 0, time.Local)

		postings := []*posting.Posting{
			{
				TransactionID: "fc-1", Date: d, Account: "Expenses:Food",
				Commodity: "INR", Amount: decimal.RequireFromString("5000"), Forecast: true,
			},
			{
				TransactionID: "exp-1", Date: d, Account: "Expenses:Food:Groceries",
				Commodity: "INR", Amount: decimal.RequireFromString("2000"),
			},
			{
				TransactionID: "exp-2", Date: d, Account: "Expenses:Food:Restaurant",
				Commodity: "INR", Amount: decimal.RequireFromString("1500"),
			},
		}
		for _, p := range postings {
			require.NoError(t, db.Create(p).Error)
		}

		bRes := GetBudget(db)
		budgetsByMonth := bRes.BudgetsByMonth
		febBudget, ok := budgetsByMonth["2024-02"]
		require.True(t, ok)
		require.Len(t, febBudget.Accounts, 1)

		ab := febBudget.Accounts[0]
		assert.Equal(t, "Expenses:Food", ab.Account)
		assert.Equal(t, "5000", ab.Forecast.String())
		assert.Equal(t, "3500", ab.Actual.String(), "Child expenses (2000+1500) must roll up into parent actual")
		assert.Equal(t, "1500", ab.Available.String(), "Available = 5000 - 3500 = 1500")
	})

	t.Run("rollover enabled carries unspent budget to next month", func(t *testing.T) {
		db := setupContractTestDB(t, "budget:\n  rollover: yes\n")
		d1 := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local)
		d2 := time.Date(2024, time.February, 1, 0, 0, 0, 0, time.Local)

		postings := []*posting.Posting{
			{TransactionID: "fc-jan", Date: d1, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("5000"), Forecast: true},
			{TransactionID: "exp-jan", Date: d1, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("3000")},
			{TransactionID: "fc-feb", Date: d2, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("5000"), Forecast: true},
			{TransactionID: "exp-feb", Date: d2, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("1000")},
		}
		for _, p := range postings {
			require.NoError(t, db.Create(p).Error)
		}

		bRes := GetBudget(db)
		budgetsByMonth := bRes.BudgetsByMonth
		febBudget := budgetsByMonth["2024-02"]
		require.NotEmpty(t, febBudget.Accounts)

		ab := febBudget.Accounts[0]
		assert.Equal(t, "2000", ab.Rollover.String(), "January unspent (5000-3000=2000) must roll over")
		assert.Equal(t, "6000", ab.Available.String(), "Available = 2000 rollover + 5000 forecast - 1000 actual = 6000")
	})

	t.Run("rollover disabled resets available each month", func(t *testing.T) {
		db := setupContractTestDB(t, "budget:\n  rollover: no\n")
		d1 := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local)
		d2 := time.Date(2024, time.February, 1, 0, 0, 0, 0, time.Local)

		postings := []*posting.Posting{
			{TransactionID: "fc-jan", Date: d1, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("5000"), Forecast: true},
			{TransactionID: "exp-jan", Date: d1, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("3000")},
			{TransactionID: "fc-feb", Date: d2, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("5000"), Forecast: true},
			{TransactionID: "exp-feb", Date: d2, Account: "Expenses:Food", Commodity: "INR", Amount: decimal.RequireFromString("1000")},
		}
		for _, p := range postings {
			require.NoError(t, db.Create(p).Error)
		}

		bRes := GetBudget(db)
		budgetsByMonth := bRes.BudgetsByMonth
		febBudget := budgetsByMonth["2024-02"]
		require.NotEmpty(t, febBudget.Accounts)

		ab := febBudget.Accounts[0]
		assert.Equal(t, "0", ab.Rollover.String(), "No rollover when disabled")
		assert.Equal(t, "4000", ab.Available.String(), "Available = 5000 forecast - 1000 actual = 4000")
	})
}

// Scenario I: FIFO Isolation
// Verifies that CostBalance maintains separate FIFO lot queues per account.
func TestContract_ScenarioI_FIFOAccountIsolation(t *testing.T) {
	d1 := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local)
	d2 := time.Date(2024, time.January, 2, 0, 0, 0, 0, time.Local)

	// Account A buys 100 @ 100, Account B buys 50 @ 50.
	// Account A sells 40.
	// FIFO in Account A leaves 60. Account B remains untouched at 50. Total = 110.
	postings := []posting.Posting{
		contractPosting(d1, "Assets:BrokerA", "INR", "100", "100"),
		contractPosting(d1, "Assets:BrokerB", "INR", "50", "50"),
		contractPosting(d2, "Assets:BrokerA", "INR", "-40", "-40"),
	}

	balance := accounting.CostBalance(postings)
	assert.Equal(t, "110", balance.String(), "FIFO must be calculated independently per account")
}

// Scenario J: Checking Account Behavior
// Checking accounts participate in cash flow balance accumulation.
func TestContract_ScenarioJ_CheckingAccountBehavior(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	d := time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local)

	p := &posting.Posting{
		TransactionID: "chk-1", Date: d, Account: "Assets:Checking:Primary",
		Commodity: "INR", Quantity: decimal.RequireFromString("25000"),
		Amount: decimal.RequireFromString("25000"), MarketAmount: decimal.RequireFromString("25000"),
	}
	require.NoError(t, db.Create(p).Error)

	cf := service.ComputeCashFlow(query.Init(db), decimal.Zero)
	require.NotEmpty(t, cf)
	assert.Equal(t, "25000", cf[0].Checking.String())
	assert.Equal(t, "25000", cf[0].Balance.String())
}

// Scenario K: Insights API Contract
func TestContract_ScenarioK_InsightsEndpoint(t *testing.T) {
	utils.SetNow("2024-02-15")
	db := setupContractTestDB(t, "")
	router := Build(db, false)

	// 1. Empty data GET /api/insights
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/insights", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), `"period":"2024-02"`)
	assert.Contains(t, w.Body.String(), `"insights":[]`)

	// 2. Specific period GET /api/insights?period=2024-01
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/insights?period=2024-01", nil)
	router.ServeHTTP(w2, req2)
	assert.Equal(t, 200, w2.Code)
	assert.Contains(t, w2.Body.String(), `"period":"2024-01"`)

	// 3. Invalid period GET /api/insights?period=not-a-date
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodGet, "/api/insights?period=not-a-date", nil)
	router.ServeHTTP(w3, req3)
	assert.Equal(t, 400, w3.Code)
	assert.Contains(t, w3.Body.String(), "invalid period format")
}
