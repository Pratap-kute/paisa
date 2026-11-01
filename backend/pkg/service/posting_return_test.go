package service

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func lot(commodity string, qty, amount, market float64, date time.Time) posting.Posting {
	return posting.Posting{
		Commodity:    commodity,
		Quantity:     decimal.NewFromFloat(qty),
		Amount:       decimal.NewFromFloat(amount),
		MarketAmount: decimal.NewFromFloat(market),
		Date:         date,
	}
}

func TestComputePostingReturn(t *testing.T) {
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\ndefault_currency: INR\n"), ""))
	bought := time.Date(2014, time.February, 1, 0, 0, 0, 0, time.UTC)

	t.Run("compound annual rate, not a linear extrapolation", func(t *testing.T) {
		today := bought.AddDate(0, 0, 4656)
		got, ok := ComputePostingReturn(lot("PPFAS", 10, 2000, 16767, bought), today)
		assert.True(t, ok)
		assert.Equal(t, 4656, got.HoldingDays)
		assert.Equal(t, "14767", got.UnrealizedGain.String())
		if assert.NotNil(t, got.AnnualizedReturn) {
			// 8.3835x over 12.75 years is about 18.1% a year; the linear figure was 57.9%.
			assert.InDelta(t, 18.14, got.AnnualizedReturn.InexactFloat64(), 0.05)
		}
	})

	t.Run("a lot held for under a year is not annualized", func(t *testing.T) {
		got, ok := ComputePostingReturn(lot("PPFAS", 10, 1000, 1050, bought), bought.AddDate(0, 0, 90))
		assert.True(t, ok)
		assert.Equal(t, "50", got.UnrealizedGain.String())
		assert.Nil(t, got.AnnualizedReturn)
	})

	t.Run("a loss is a negative rate", func(t *testing.T) {
		got, ok := ComputePostingReturn(lot("NIFTY", 10, 1000, 800, bought), bought.AddDate(2, 0, 0))
		assert.True(t, ok)
		assert.Equal(t, "-200", got.UnrealizedGain.String())
		if assert.NotNil(t, got.AnnualizedReturn) {
			assert.InDelta(t, -10.56, got.AnnualizedReturn.InexactFloat64(), 0.05)
		}
	})

	t.Run("not applicable", func(t *testing.T) {
		today := bought.AddDate(2, 0, 0)
		cases := map[string]posting.Posting{
			"currency posting": lot("INR", 100, 100, 100, bought),
			"sale":             lot("NIFTY", -2, -300, -320, bought),
			"stock split":      lot("NIFTY", 5, 0, 500, bought),
			"bought today":     lot("NIFTY", 2, 200, 200, today),
		}
		for name, p := range cases {
			_, ok := ComputePostingReturn(p, today)
			assert.False(t, ok, name)
		}
	})
}
