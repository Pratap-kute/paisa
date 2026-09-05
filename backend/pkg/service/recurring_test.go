package service

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/stretchr/testify/require"
)

func TestRecurringManualIdentityRemainsAuthoritative(t *testing.T) {
	date := func(value string) time.Time {
		d, err := time.Parse("2006-01-02", value)
		require.NoError(t, err)
		return d
	}
	postings := []posting.Posting{
		{TransactionID: "one", Date: date("2024-01-01"), TagRecurring: "Manual", TagPeriod: "L * ?", Account: "Expenses:Rent"},
		{TransactionID: "one", Date: date("2024-01-01"), TagRecurring: "Manual", Account: "Assets:Bank"},
		{TransactionID: "two", Date: date("2024-03-18"), TagRecurring: "Manual", TagPeriod: "15 * ?", Account: "Expenses:Rent"},
		{TransactionID: "single", Date: date("2024-05-01"), TagRecurring: "Explicit single", Account: "Income:Salary"},
		{TransactionID: "untagged", Date: date("2024-05-01"), Account: "Expenses:Entertainment"},
	}
	sequences := ComputeRecurringTransactions(postings)
	require.Len(t, sequences, 2)
	for _, sequence := range sequences {
		switch sequence.Key {
		case "Manual":
			require.Len(t, sequence.Transactions, 2)
			require.Equal(t, "two", sequence.Transactions[0].ID)
			require.Equal(t, "15 * ?", sequence.Period)
			require.Equal(t, 77, sequence.Interval)
		case "Explicit single":
			require.Len(t, sequence.Transactions, 1)
			require.Equal(t, 0, sequence.Interval)
		default:
			t.Fatalf("unexpected recurring identity: %s", sequence.Key)
		}
	}
}
