package service

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
)

func TestMonthlyContributions(t *testing.T) {
	asOf := time.Date(2026, 9, 5, 0, 0, 0, 0, time.Local)
	post := func(date, account string, amount int64) posting.Posting {
		d, err := time.ParseInLocation("2006-01-02", date, time.Local)
		require.NoError(t, err)
		return posting.Posting{Date: d, Account: account, Commodity: "INR", Amount: decimal.NewFromInt(amount), MarketAmount: decimal.NewFromInt(amount * 2), TransactionID: date}
	}
	tests := []struct {
		name     string
		posts    []posting.Posting
		accounts []string
		amounts  []string
	}{
		{"empty", nil, []string{"Assets:Goal:*"}, nil},
		{"normal and missed months", []posting.Posting{post("2026-06-01", "Assets:Goal:Bank", 10000), post("2026-08-01", "Assets:Goal:Bank", 10000)}, []string{"Assets:Goal:*"}, []string{"10000", "0", "10000"}},
		{"internal transfer and withdrawal", []posting.Posting{post("2026-06-01", "Assets:Goal:Bank", 50000), post("2026-07-01", "Assets:Goal:Bank", -50000), post("2026-07-01", "Assets:Goal:Fund", 50000), post("2026-08-01", "Assets:Goal:Fund", -20000)}, []string{"Assets:Goal:*"}, []string{"50000", "0", "-20000"}},
		{"realized gains retained inside goal", []posting.Posting{post("2026-06-01", "Assets:Goal:Fund", 10000), post("2026-07-01", "Assets:Goal:Fund", -10000), post("2026-07-01", "Assets:Goal:Bank", 15000), post("2026-07-01", "Income:CapitalGains:Goal:Fund", -5000)}, []string{"Assets:Goal:*"}, []string{"10000", "0", "0"}},
		{"sale proceeds leave goal", []posting.Posting{post("2026-06-01", "Assets:Goal:Fund", 10000), post("2026-07-01", "Assets:Goal:Fund", -10000), post("2026-07-01", "Assets:Outside", 15000), post("2026-07-01", "Income:CapitalGains:Goal:Fund", -5000)}, []string{"Assets:Goal:*"}, []string{"10000", "-15000", "0"}},
		{"market appreciation is not contribution", []posting.Posting{post("2026-01-01", "Assets:Goal:Fund", 10000)}, []string{"Assets:Goal:*"}, []string{"0", "0", "0", "0", "0", "0"}},
		{"current month and future excluded", []posting.Posting{post("2026-09-01", "Assets:Goal:Bank", 10000), post("2026-10-01", "Assets:Goal:Bank", 10000)}, []string{"Assets:Goal:*"}, nil},
		{"lump sum has one observed month", []posting.Posting{post("2026-08-15", "Assets:Goal:Bank", 900000)}, []string{"Assets:Goal:*"}, []string{"900000"}},
		{"overlapping globs do not double count", []posting.Posting{post("2026-08-01", "Assets:Goal:Bank", 10000), post("2026-08-01", "Assets:Outside", 30000)}, []string{"Assets:Goal:*", "Assets:Goal:Bank"}, []string{"10000"}},
		{"negated glob", []posting.Posting{post("2026-08-01", "Assets:Goal:Bank", 10000), post("2026-08-01", "Assets:Goal:Fund", 30000)}, []string{"Assets:Goal:*", "!Assets:Goal:Fund"}, []string{"10000"}},
		{"interest payments leaving goal are withdrawals", []posting.Posting{post("2026-08-01", "Assets:Goal:Bank", -500), post("2026-08-01", "Expenses:Interest:Loan", 500)}, []string{"Assets:Goal:*"}, []string{"-500"}},
		{"interest is excluded", []posting.Posting{post("2026-08-01", "Assets:Goal:Bank", 500), post("2026-08-01", "Income:Interest:Goal:Bank", -500)}, []string{"Assets:Goal:*"}, []string{"0"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := serviceTestDB(t)
			if len(tt.posts) > 0 {
				require.NoError(t, db.Create(&tt.posts).Error)
			}
			result := MonthlyContributions(db, query.Init(db).Like("Assets:%", "Income:CapitalGains:%").All(), tt.accounts, asOf)
			require.Len(t, result, len(tt.amounts))
			for i, amount := range tt.amounts {
				require.Equal(t, amount, result[i].Amount.String())
				require.Equal(t, asOf.AddDate(0, -len(tt.amounts)+i, 0).Format("2006-01"), result[i].Month)
			}
		})
	}
}

func TestContributionsWithSecuritiesAndStockSplits(t *testing.T) {
	db := serviceTestDB(t)
	asOf := time.Date(2026, 9, 5, 0, 0, 0, 0, time.Local)
	makePost := func(month int, tx, account, commodity string, amount, quantity int64) posting.Posting {
		return posting.Posting{Date: time.Date(2026, time.Month(month), 1, 0, 0, 0, 0, time.Local), TransactionID: tx, Account: account, Commodity: commodity, Amount: decimal.NewFromInt(amount), Quantity: decimal.NewFromInt(quantity), MarketAmount: decimal.NewFromInt(999999)}
	}
	posts := []posting.Posting{
		makePost(6, "buy", "Assets:Goal:Fund", "AAPL", 10000, 10),
		makePost(6, "buy", "Assets:Outside", "INR", -10000, -10000),
		makePost(7, "split", "Assets:Goal:Fund", "AAPL", -10000, -10),
		makePost(7, "split", "Assets:Goal:Fund", "AAPL", 10000, 20),
		makePost(8, "sale", "Assets:Goal:Fund", "AAPL", -10000, -20),
		makePost(8, "sale", "Assets:Goal:Bank", "INR", 15000, 15000),
		makePost(8, "sale", "Income:CapitalGains:Goal:Fund", "INR", -5000, -5000),
	}
	require.NoError(t, db.Create(&posts).Error)
	result := MonthlyContributions(db, query.Init(db).Like("Assets:%", "Income:CapitalGains:%").All(), []string{"Assets:Goal:*"}, asOf)
	require.Len(t, result, 3)
	require.Equal(t, "10000", result[0].Amount.String())
	require.True(t, result[1].Amount.IsZero())
	require.True(t, result[2].Amount.IsZero())
}
