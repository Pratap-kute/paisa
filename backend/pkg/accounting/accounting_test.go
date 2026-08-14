package accounting

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func accountingDate(day int) time.Time {
	return time.Date(2024, time.January, day, 0, 0, 0, 0, time.UTC)
}

func accountingPosting(day int, account, commodity, quantity, amount string) posting.Posting {
	return posting.Posting{
		Date: accountingDate(day), Account: account, Commodity: commodity,
		Quantity: decimal.RequireFromString(quantity), Amount: decimal.RequireFromString(amount),
		MarketAmount: decimal.RequireFromString(amount),
	}
}

func TestFIFO(t *testing.T) {
	tests := []struct {
		name     string
		postings []posting.Posting
		wantQty  []string
		wantAmt  []string
	}{
		{name: "empty"},
		{name: "keeps purchase", postings: []posting.Posting{accountingPosting(1, "Assets:Broker", "AAPL", "10", "1000")}, wantQty: []string{"10"}, wantAmt: []string{"1000"}},
		{name: "partial sale consumes oldest lot", postings: []posting.Posting{
			accountingPosting(1, "Assets:Broker", "AAPL", "10", "1000"), accountingPosting(2, "Assets:Broker", "AAPL", "-4", "-600"),
		}, wantQty: []string{"6"}, wantAmt: []string{"600"}},
		{name: "full sale removes lot", postings: []posting.Posting{
			accountingPosting(1, "Assets:Broker", "AAPL", "10", "1000"), accountingPosting(2, "Assets:Broker", "AAPL", "-10", "-1200"),
		}},
		{name: "sale spans lots", postings: []posting.Posting{
			accountingPosting(1, "Assets:Broker", "AAPL", "5", "500"), accountingPosting(2, "Assets:Broker", "AAPL", "10", "1200"), accountingPosting(3, "Assets:Broker", "AAPL", "-8", "-1000"),
		}, wantQty: []string{"7"}, wantAmt: []string{"840"}},
		{name: "currency uses amount", postings: []posting.Posting{
			accountingPosting(1, "Assets:Cash", "INR", "100", "100"), accountingPosting(2, "Assets:Cash", "INR", "-40", "-40"),
		}, wantQty: []string{"60"}, wantAmt: []string{"60"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FIFO(tt.postings)
			require.Len(t, got, len(tt.wantQty))
			for i := range got {
				assert.Equal(t, tt.wantQty[i], got[i].Quantity.String())
				assert.Equal(t, tt.wantAmt[i], got[i].Amount.String())
			}
		})
	}
}

func TestRegister(t *testing.T) {
	got := Register([]posting.Posting{
		accountingPosting(1, "Assets:Cash", "INR", "10", "10"),
		accountingPosting(1, "Assets:Cash", "INR", "5", "5"),
		accountingPosting(2, "Assets:Cash", "INR", "-3", "-3"),
	})
	require.Len(t, got, 2)
	assert.Equal(t, "15", got[0].Quantity.String())
	assert.Equal(t, "12", got[1].Quantity.String())
}

func TestBalanceAggregates(t *testing.T) {
	postings := []posting.Posting{
		accountingPosting(1, "Assets:A", "INR", "10", "10"),
		accountingPosting(2, "Assets:A", "INR", "-3", "-3"),
		accountingPosting(2, "Assets:B", "INR", "5", "5"),
	}
	tests := []struct {
		name string
		fn   func([]posting.Posting) decimal.Decimal
		want string
	}{
		{name: "cost sum", fn: CostSum, want: "12"},
		{name: "current balance", fn: CurrentBalance, want: "12"},
		{name: "cost balance grouped by account", fn: CostBalance, want: "12"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) { assert.Equal(t, tt.want, tt.fn(postings).String()) })
	}
}

func TestPopulateBalanceKeepsAccountsIndependent(t *testing.T) {
	got := PopulateBalance([]posting.Posting{
		accountingPosting(3, "Assets:A", "INR", "-2", "-2"),
		accountingPosting(1, "Assets:A", "INR", "10", "10"),
		accountingPosting(2, "Assets:B", "INR", "7", "7"),
	})
	assert.Equal(t, []string{"10", "7", "8"}, []string{got[0].Balance.String(), got[1].Balance.String(), got[2].Balance.String()})
}

func TestGroupByMonthlyBillingCycle(t *testing.T) {
	posts := []posting.Posting{
		accountingPosting(10, "Expenses:A", "INR", "1", "1"),
		accountingPosting(20, "Expenses:B", "INR", "1", "1"),
	}
	got := GroupByMonthlyBillingCycle(posts, 15)
	assert.Len(t, got["2024-01"], 1)
	assert.Len(t, got["2024-02"], 1)
}

func TestSortPostings(t *testing.T) {
	for _, tt := range []struct {
		name string
		sort func([]posting.Posting) []posting.Posting
		want []int
	}{
		{name: "ascending", sort: SortAsc, want: []int{1, 2, 3}},
		{name: "descending", sort: SortDesc, want: []int{3, 2, 1}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.sort([]posting.Posting{accountingPosting(3, "A", "INR", "1", "1"), accountingPosting(1, "A", "INR", "1", "1"), accountingPosting(2, "A", "INR", "1", "1")})
			assert.Equal(t, tt.want, []int{got[0].Date.Day(), got[1].Date.Day(), got[2].Date.Day()})
		})
	}
}

func TestBuildBalancedPostingsSplitsCounterPosting(t *testing.T) {
	transactions := []transaction.Transaction{{Postings: []posting.Posting{
		accountingPosting(1, "Expenses:Food", "INR", "40", "40"),
		accountingPosting(1, "Expenses:Travel", "INR", "60", "60"),
		accountingPosting(1, "Assets:Cash", "INR", "-100", "-100"),
	}}}
	got := BuildBalancedPostings(transactions)
	require.Len(t, got, 2)
	assert.Equal(t, "100", got[0].From.Amount.Add(got[1].From.Amount).Abs().String())
}
