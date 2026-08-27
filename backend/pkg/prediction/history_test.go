package prediction

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHistoryFromPostingsFiltersUnknownEmptyAndForecast(t *testing.T) {
	db := predictionTestDB(t)
	posts := []posting.Posting{
		predictionPosting("Expenses:Food", "Starbucks", 250),
		{
			TransactionID: "unknown",
			Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
			Account:       "Expenses:Unknown",
			Payee:         "Mystery",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(10),
			MarketAmount:  decimal.NewFromInt(10),
		},
		{
			TransactionID: "empty-payee",
			Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
			Account:       "Expenses:Food",
			Payee:         "  ",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(10),
			MarketAmount:  decimal.NewFromInt(10),
		},
		{
			TransactionID: "forecast",
			Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
			Account:       "Expenses:Food",
			Payee:         "Forecast Coffee",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(10),
			MarketAmount:  decimal.NewFromInt(10),
			Forecast:      true,
		},
		{
			TransactionID: "empty-account",
			Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
			Account:       "",
			Payee:         "No Account",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(10),
			MarketAmount:  decimal.NewFromInt(10),
		},
	}
	require.NoError(t, db.Create(&posts).Error)

	entries := HistoryFromPostings(db)
	require.Len(t, entries, 1)
	assert.Equal(t, "Starbucks", entries[0].Payee)
	assert.Equal(t, "Expenses:Food", entries[0].CategoryAccount)
	assert.Equal(t, 250.0, entries[0].Amount)
	assert.Equal(t, 250.0, entries[0].AbsoluteAmount)
	assert.Equal(t, "2024-01-01", entries[0].Date)
	assert.Equal(t, "INR", entries[0].Commodity)
	assert.Nil(t, entries[0].SourceAccount)
	assert.Nil(t, entries[0].Direction)
}

func TestGetHistoryShape(t *testing.T) {
	db := predictionTestDB(t)
	require.NoError(t, db.Create([]posting.Posting{
		predictionPosting("Income:Salary", "Acme", 1000),
	}).Error)
	result := GetHistory(db)
	require.Len(t, result.History, 1)
	assert.Equal(t, "Acme", result.History[0].Payee)
	assert.Equal(t, "Income:Salary", result.History[0].CategoryAccount)
	assert.NotEmpty(t, result.History[0].TransactionID)
}

func TestHistoryExposesSourceAndDirectionWhenDeterminable(t *testing.T) {
	db := predictionTestDB(t)
	date := time.Date(2024, time.March, 2, 0, 0, 0, 0, time.Local)
	require.NoError(t, db.Create([]posting.Posting{
		{
			TransactionID: "coffee",
			Date:          date,
			Account:       "Expenses:Food",
			Payee:         "Starbucks",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(250),
			MarketAmount:  decimal.NewFromInt(250),
		},
		{
			TransactionID: "coffee",
			Date:          date,
			Account:       "Assets:Checking",
			Payee:         "Starbucks",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(-250),
			MarketAmount:  decimal.NewFromInt(-250),
		},
	}).Error)

	entries := HistoryFromPostings(db)
	require.Len(t, entries, 1)
	assert.Equal(t, "coffee", entries[0].TransactionID)
	assert.Equal(t, "Starbucks", entries[0].Payee)
	assert.Equal(t, "Expenses:Food", entries[0].CategoryAccount)
	require.NotNil(t, entries[0].SourceAccount)
	assert.Equal(t, "Assets:Checking", *entries[0].SourceAccount)
	assert.Equal(t, 250.0, entries[0].Amount)
	assert.Equal(t, 250.0, entries[0].AbsoluteAmount)
	require.NotNil(t, entries[0].Direction)
	assert.Equal(t, DirectionDebit, *entries[0].Direction)
	assert.Equal(t, "INR", entries[0].Commodity)
}

func TestHistoryDoesNotInventSourceOrDirectionForTransfers(t *testing.T) {
	db := predictionTestDB(t)
	date := time.Date(2024, time.March, 3, 0, 0, 0, 0, time.Local)
	require.NoError(t, db.Create([]posting.Posting{
		{
			TransactionID: "xfer",
			Date:          date,
			Account:       "Assets:Checking",
			Payee:         "IMPS to Savings",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(-5000),
			MarketAmount:  decimal.NewFromInt(-5000),
		},
		{
			TransactionID: "xfer",
			Date:          date,
			Account:       "Assets:Savings",
			Payee:         "IMPS to Savings",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(5000),
			MarketAmount:  decimal.NewFromInt(5000),
		},
	}).Error)

	entries := HistoryFromPostings(db)
	require.Len(t, entries, 2)
	for _, entry := range entries {
		assert.Nil(t, entry.SourceAccount)
		assert.Nil(t, entry.Direction)
		assert.Equal(t, 5000.0, entry.AbsoluteAmount)
	}
}

func TestHistoryDoesNotTreatExpenses2AsExpenses(t *testing.T) {
	db := predictionTestDB(t)
	date := time.Date(2024, time.March, 4, 0, 0, 0, 0, time.Local)
	require.NoError(t, db.Create([]posting.Posting{
		{
			TransactionID: "odd",
			Date:          date,
			Account:       "Expenses2:Food",
			Payee:         "Cafe",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(10),
			MarketAmount:  decimal.NewFromInt(10),
		},
		{
			TransactionID: "odd",
			Date:          date,
			Account:       "Assets:Checking",
			Payee:         "Cafe",
			Commodity:     "INR",
			Amount:        decimal.NewFromInt(-10),
			MarketAmount:  decimal.NewFromInt(-10),
		},
	}).Error)

	entries := HistoryFromPostings(db)
	require.Len(t, entries, 2)
	for _, entry := range entries {
		assert.Nil(t, entry.SourceAccount)
		assert.Nil(t, entry.Direction)
	}
}
