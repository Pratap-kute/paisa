package service

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/internal/config"
	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/ananthakumaran/paisa/internal/model/price"
	"github.com/ananthakumaran/paisa/internal/model/transaction"
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
