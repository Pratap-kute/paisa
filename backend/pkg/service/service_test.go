package service

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func serviceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\n"), ""))
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}, &price.Price{}))
	ClearPriceCache()
	ClearInterestCache()
	transaction.ClearCache()
	t.Cleanup(func() {
		ClearPriceCache()
		ClearInterestCache()
		transaction.ClearCache()
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

func serviceDate(day int) time.Time {
	return time.Date(2024, time.January, day, 0, 0, 0, 0, time.Local)
}

func seedPrices(t *testing.T, db *gorm.DB) {
	t.Helper()
	prices := []price.Price{
		{Date: serviceDate(1), CommodityType: config.Stock, CommodityName: "AAPL", Value: decimal.NewFromInt(100)},
		{Date: serviceDate(10), CommodityType: config.Stock, CommodityName: "AAPL", Value: decimal.NewFromInt(120)},
		{Date: serviceDate(5), CommodityType: config.Unknown, CommodityName: "AAPL", Value: decimal.NewFromInt(110)},
	}
	require.NoError(t, db.Create(&prices).Error)
	require.NoError(t, db.Create(&posting.Posting{TransactionID: "seed", Date: serviceDate(5), Account: "Assets:Broker", Commodity: "AAPL", Quantity: decimal.NewFromInt(1), Amount: decimal.NewFromInt(110)}).Error)
}

func TestPriceLookupAndMarketValue(t *testing.T) {
	db := serviceTestDB(t)
	seedPrices(t, db)

	tests := []struct {
		name string
		run  func() string
		want string
	}{
		{name: "unit price exact date", run: func() string { return GetUnitPrice(db, "AAPL", serviceDate(10)).Value.String() }, want: "120"},
		{name: "unit price uses prior date", run: func() string { return GetUnitPrice(db, "AAPL", serviceDate(7)).Value.String() }, want: "100"},
		{name: "market price multiplies quantity", run: func() string {
			return GetMarketPrice(db, posting.Posting{Commodity: "AAPL", Quantity: decimal.NewFromInt(3)}, serviceDate(10)).String()
		}, want: "360"},
		{name: "currency keeps amount", run: func() string {
			return GetMarketPrice(db, posting.Posting{Commodity: "INR", Amount: decimal.NewFromInt(75)}, serviceDate(10)).String()
		}, want: "75"},
		{name: "get price returns currency quantity", run: func() string { return GetPrice(db, "INR", decimal.NewFromInt(4), serviceDate(10)).String() }, want: "4"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) { assert.Equal(t, tt.want, tt.run()) })
	}
}

func TestGetAllPricesPrefersProviderPriceOnSameDate(t *testing.T) {
	db := serviceTestDB(t)
	seedPrices(t, db)
	got := GetAllPrices(db, "AAPL")
	require.Len(t, got, 3)
	assert.Equal(t, []string{"120", "110", "100"}, []string{got[0].Value.String(), got[1].Value.String(), got[2].Value.String()})
}

func TestClearPriceCacheReloadsDatabaseChanges(t *testing.T) {
	db := serviceTestDB(t)
	seedPrices(t, db)
	assert.Equal(t, "120", GetUnitPrice(db, "AAPL", serviceDate(10)).Value.String())
	require.NoError(t, db.Model(&price.Price{}).Where("commodity_name = ? AND date = ?", "AAPL", serviceDate(10)).Update("value", decimal.NewFromInt(125)).Error)
	assert.Equal(t, "120", GetUnitPrice(db, "AAPL", serviceDate(10)).Value.String())
	ClearPriceCache()
	assert.Equal(t, "125", GetUnitPrice(db, "AAPL", serviceDate(10)).Value.String())
}

func TestPostingClassifications(t *testing.T) {
	tests := []struct {
		name string
		post posting.Posting
		fn   func(posting.Posting) bool
		want bool
	}{
		{name: "capital gain child", post: posting.Posting{Account: "Income:CapitalGains:Broker"}, fn: IsCapitalGains, want: true},
		{name: "capital gain parent is not posting account", post: posting.Posting{Account: "Income:CapitalGains"}, fn: IsCapitalGains, want: false},
		{name: "refund child", post: posting.Posting{Account: "Income:Refund:Merchant"}, fn: IsRefund, want: true},
		{name: "ordinary income", post: posting.Posting{Account: "Income:Salary"}, fn: IsRefund, want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) { assert.Equal(t, tt.want, tt.fn(tt.post)) })
	}
}

func TestTransactionClassifications(t *testing.T) {
	tests := []struct {
		name  string
		posts []posting.Posting
		check func(*gorm.DB, posting.Posting) bool
		want  bool
	}{
		{name: "stock split", posts: []posting.Posting{{Account: "Assets:Broker", Commodity: "AAPL", Quantity: decimal.NewFromInt(1)}, {Account: "Assets:Broker", Commodity: "AAPL", Quantity: decimal.NewFromInt(-1)}}, check: IsStockSplit, want: true},
		{name: "currency prevents stock split", posts: []posting.Posting{{Account: "Assets:Broker", Commodity: "AAPL"}, {Account: "Assets:Broker", Commodity: "INR"}}, check: IsStockSplit, want: false},
		{name: "sale with capital gains", posts: []posting.Posting{{Account: "Assets:Broker", Commodity: "AAPL"}, {Account: "Income:CapitalGains:Broker", Commodity: "INR"}}, check: IsSellWithCapitalGains, want: true},
		{name: "contra posting refund", posts: []posting.Posting{{Account: "Assets:Checking", Commodity: "INR"}, {Account: "Income:Refund:Shop", Commodity: "INR"}}, check: IsContraPostingRefund, want: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := serviceTestDB(t)
			for i := range tt.posts {
				tt.posts[i].TransactionID = tt.name
				tt.posts[i].Date = serviceDate(1)
			}
			require.NoError(t, db.Create(&tt.posts).Error)
			transaction.ClearCache()
			assert.Equal(t, tt.want, tt.check(db, tt.posts[0]))
		})
	}
}

func TestInterestMatching(t *testing.T) {
	db := serviceTestDB(t)
	date := serviceDate(7)
	rows := []posting.Posting{
		{TransactionID: "interest-source", Date: date, Payee: "Bank", Account: "Income:Interest:Savings", Commodity: "INR", Amount: decimal.NewFromInt(-10)},
		{TransactionID: "repayment-source", Date: date, Payee: "Lender", Account: "Expenses:Interest:Loan", Commodity: "INR", Amount: decimal.NewFromInt(15)},
	}
	require.NoError(t, db.Create(&rows).Error)

	tests := []struct {
		name string
		post posting.Posting
		fn   func(*gorm.DB, posting.Posting) bool
		want bool
	}{
		{name: "matching interest counter posting", post: posting.Posting{Date: date, Payee: "Bank", Commodity: "INR", Amount: decimal.NewFromInt(10)}, fn: IsInterest, want: true},
		{name: "interest payee mismatch", post: posting.Posting{Date: date, Payee: "Other", Commodity: "INR", Amount: decimal.NewFromInt(10)}, fn: IsInterest, want: false},
		{name: "matching repayment counter posting", post: posting.Posting{Date: date, Payee: "Lender", Commodity: "INR", Amount: decimal.NewFromInt(-15)}, fn: IsInterestRepayment, want: true},
		{name: "expense interest account is repayment", post: posting.Posting{Date: date, Account: "Expenses:Interest:Loan", Commodity: "INR", Amount: decimal.NewFromInt(15)}, fn: IsInterestRepayment, want: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ClearInterestCache()
			assert.Equal(t, tt.want, tt.fn(db, tt.post))
		})
	}
}

func TestComputeNetworthOnParity(t *testing.T) {
	db := serviceTestDB(t)
	date := serviceDate(10)

	// Create diverse postings:
	// 1. Stock split (AAPL +10 / -10)
	// 2. Regular investment in MutualFunds (50,000)
	// 3. Regular withdrawal from Checking (-10,000)
	// 4. Interest income in Checking (500)
	// 5. Capital gains offset (-2,000)
	postings := []posting.Posting{
		{TransactionID: "split", Date: date, Account: "Assets:Broker", Commodity: "AAPL", Quantity: decimal.NewFromInt(10), Amount: decimal.NewFromInt(0)},
		{TransactionID: "split", Date: date, Account: "Assets:Broker", Commodity: "AAPL", Quantity: decimal.NewFromInt(-10), Amount: decimal.NewFromInt(0)},
		{TransactionID: "inv", Date: date, Account: "Assets:MutualFunds", Commodity: "INR", Amount: decimal.NewFromInt(50000)},
		{TransactionID: "wdr", Date: date, Account: "Assets:Checking", Commodity: "INR", Amount: decimal.NewFromInt(-10000)},
		{TransactionID: "int-src", Date: date, Payee: "Bank", Account: "Income:Interest:Savings", Commodity: "INR", Amount: decimal.NewFromInt(-500)},
		{TransactionID: "int-dest", Date: date, Payee: "Bank", Account: "Assets:Checking", Commodity: "INR", Amount: decimal.NewFromInt(500)},
		{TransactionID: "cg", Date: date, Account: "Income:CapitalGains:Broker", Commodity: "INR", Amount: decimal.NewFromInt(-2000)},
	}
	require.NoError(t, db.Create(&postings).Error)
	transaction.ClearCache()
	ClearInterestCache()

	nwAll := ComputeNetworth(db, postings)
	nwOn := ComputeNetworthOn(db, postings, date)

	assert.True(t, nwAll.InvestmentAmount.Equal(nwOn.InvestmentAmount), "InvestmentAmount must match: all=%s on=%s", nwAll.InvestmentAmount, nwOn.InvestmentAmount)
	assert.True(t, nwAll.WithdrawalAmount.Equal(nwOn.WithdrawalAmount), "WithdrawalAmount must match: all=%s on=%s", nwAll.WithdrawalAmount, nwOn.WithdrawalAmount)
	assert.True(t, nwAll.GainAmount.Equal(nwOn.GainAmount), "GainAmount must match: all=%s on=%s", nwAll.GainAmount, nwOn.GainAmount)
	assert.True(t, nwAll.BalanceAmount.Equal(nwOn.BalanceAmount), "BalanceAmount must match: all=%s on=%s", nwAll.BalanceAmount, nwOn.BalanceAmount)
	assert.True(t, nwAll.NetInvestmentAmount.Equal(nwOn.NetInvestmentAmount), "NetInvestmentAmount must match: all=%s on=%s", nwAll.NetInvestmentAmount, nwOn.NetInvestmentAmount)
}

func TestSavingsSummaryParity(t *testing.T) {
	start := time.Date(2024, time.April, 1, 0, 0, 0, 0, time.Local)
	end := time.Date(2025, time.March, 31, 23, 59, 59, 0, time.Local)

	assets := []posting.Posting{
		{Date: time.Date(2024, time.June, 1, 0, 0, 0, 0, time.Local), Account: "Assets:MF", Amount: decimal.NewFromInt(30000)},
	}
	expenses := []posting.Posting{
		{Date: time.Date(2024, time.June, 1, 0, 0, 0, 0, time.Local), Account: "Expenses:Tax", Amount: decimal.NewFromInt(10000)},
		{Date: time.Date(2024, time.June, 1, 0, 0, 0, 0, time.Local), Account: "Expenses:Food", Amount: decimal.NewFromInt(20000)},
	}
	incomes := []posting.Posting{
		{Date: time.Date(2024, time.June, 1, 0, 0, 0, 0, time.Local), Account: "Income:Salary", Amount: decimal.NewFromInt(-100000)},
	}

	summary := ComputeSavingsSummary(assets, expenses, incomes, start, end)
	yearlyCards := ComputeInvestmentYearlyCard(start, assets, expenses, incomes)

	require.NotEmpty(t, yearlyCards)
	card := yearlyCards[0]

	assert.True(t, summary.GrossSalaryIncome.Equal(card.GrossSalaryIncome))
	assert.True(t, summary.GrossOtherIncome.Equal(card.GrossOtherIncome))
	assert.True(t, summary.NetTax.Equal(card.NetTax))
	assert.True(t, summary.NetIncome.Equal(card.NetIncome))
	assert.True(t, summary.NetInvestment.Equal(card.NetInvestment))
	assert.True(t, summary.NetExpense.Equal(card.NetExpense))
	assert.True(t, summary.SavingsRate.Equal(card.SavingsRate))
}
