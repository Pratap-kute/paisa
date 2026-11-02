package service

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProjectExpensePace(t *testing.T) {
	asOf := func(day int) time.Time { return time.Date(2026, time.September, day, 0, 0, 0, 0, time.UTC) }
	money := func(v int64) decimal.Decimal { return decimal.NewFromInt(v) }
	planned := money(25000)

	t.Run("extrapolates linearly over the month", func(t *testing.T) {
		pace := ProjectExpensePace(money(10000), &planned, asOf(10))
		require.NotNil(t, pace)
		assert.Equal(t, "2026-09", pace.Period)
		assert.Equal(t, "30000", pace.ProjectedExpenses.String())
		require.NotNil(t, pace.OverBudget)
		assert.Equal(t, "5000", pace.OverBudget.String())
	})

	t.Run("within the plan there is no overrun", func(t *testing.T) {
		pace := ProjectExpensePace(money(5000), &planned, asOf(10))
		require.NotNil(t, pace)
		assert.Equal(t, "15000", pace.ProjectedExpenses.String())
		assert.Nil(t, pace.OverBudget)
	})

	t.Run("no budget configured", func(t *testing.T) {
		pace := ProjectExpensePace(money(10000), nil, asOf(10))
		require.NotNil(t, pace)
		assert.Nil(t, pace.OverBudget)
		zero := money(0)
		assert.Nil(t, ProjectExpensePace(money(10000), &zero, asOf(10)).OverBudget)
	})

	t.Run("too early in the month or nothing spent", func(t *testing.T) {
		assert.Nil(t, ProjectExpensePace(money(10000), &planned, asOf(2)))
		assert.Nil(t, ProjectExpensePace(money(0), &planned, asOf(20)))
		assert.NotNil(t, ProjectExpensePace(money(100), &planned, asOf(MinElapsedDaysForCalendarPace)))
	})
}
