package service

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func parseTestDate(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}

func TestProjectAccountBudget_ObservedVsFuturePostings(t *testing.T) {
	// P0 scenario:
	// Today is Sep 06.
	// Observed spend through Sep 06 is ₹3,000.
	// There is a future-dated posting on Sep 20 for ₹10,000.
	// Therefore AccountBudget.Actual is ₹13,000.
	//
	// Historical timing: 25% of spending occurs by day 6.
	// Pacing projection on observed spend (3,000 / 25%) = ₹12,000.
	// But known actual is ₹13,000.
	// Final projected spend must be max(Actual=13,000, Pacing=12,000) = ₹13,000.
	// It must NOT extrapolate the future ₹10,000 into 13,000 / 0.25 = ₹52,000!

	asOf := parseTestDate("2026-09-06")
	budget := AccountBudget{
		Account:  "Expenses:Groceries",
		Forecast: decimal.NewFromInt(15000),
		Actual:   decimal.NewFromInt(13000), // 3,000 past + 10,000 future
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(3000)

	history := []BudgetHistoryMonth{
		{
			Month:               parseTestDate("2026-08-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(10000),
			SpendThroughAsOfDay: decimal.NewFromInt(2500), // 25%
		},
		{
			Month:               parseTestDate("2026-07-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(12000),
			SpendThroughAsOfDay: decimal.NewFromInt(3000), // 25%
		},
		{
			Month:               parseTestDate("2026-06-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(8000),
			SpendThroughAsOfDay: decimal.NewFromInt(2000), // 25%
		},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	assert.True(t, decimal.NewFromInt(13000).Equal(*proj.ProjectedSpend), "Projected spend must be 13,000, not 52,000")
	assert.Equal(t, BudgetProjectionSourceHistoricalTiming, proj.Source)
	assert.Equal(t, 3, proj.HistoricalSampleCount)
	assert.True(t, decimal.NewFromInt(3000).Equal(proj.ObservedSpend))
	assert.True(t, decimal.NewFromInt(15000).Equal(proj.EffectiveBudget))
	// 13,000 / 15,000 = 86.67% -> on-track (< 95%)
	assert.Equal(t, BudgetProjectionStatusOnTrack, proj.Status)
	assert.True(t, decimal.NewFromInt(2000).Equal(*proj.ProjectedRemaining))
	assert.True(t, decimal.Zero.Equal(*proj.ProjectedOverrun))
}

func TestProjectAccountBudget_FuturePostingsDoNotTriggerOverspent(t *testing.T) {
	// P0 Review scenario:
	// Budget: ₹10,000.
	// Spent through today (Sep 6): ₹3,000 (ObservedSpend).
	// Future entry on Sep 20: ₹8,000.
	// Total month known (Actual): ₹11,000.
	//
	// User has NOT overspent today (3,000 <= 10,000).
	// But known postings will exceed budget (11,000 > 10,000).
	// Status MUST be 'likely-over', NOT 'overspent'!
	// Projected overrun: ₹1,000.

	asOf := parseTestDate("2026-09-06")
	budget := AccountBudget{
		Account:  "Expenses:Groceries",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(11000), // 3,000 observed + 8,000 future
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(3000)

	history := []BudgetHistoryMonth{
		{
			Month:               parseTestDate("2026-08-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(10000),
			SpendThroughAsOfDay: decimal.NewFromInt(3000), // 30%
		},
		{
			Month:               parseTestDate("2026-07-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(10000),
			SpendThroughAsOfDay: decimal.NewFromInt(3000), // 30%
		},
		{
			Month:               parseTestDate("2026-06-01"),
			MonthHasExpenseData: true,
			FullMonthSpend:      decimal.NewFromInt(10000),
			SpendThroughAsOfDay: decimal.NewFromInt(3000), // 30%
		},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	// Pacing gives 3,000 / 0.30 = 10,000, but Actual is 11,000.
	// Projected spend = max(11,000, 10,000) = 11,000.
	assert.True(t, decimal.NewFromInt(11000).Equal(*proj.ProjectedSpend))
	assert.True(t, decimal.NewFromInt(3000).Equal(proj.ObservedSpend))
	assert.True(t, decimal.NewFromInt(10000).Equal(proj.EffectiveBudget))

	// Critical P0 assertion: Must be likely-over, NOT overspent!
	assert.Equal(t, BudgetProjectionStatusLikelyOver, proj.Status)
	require.NotNil(t, proj.ProjectedOverrun)
	assert.True(t, decimal.NewFromInt(1000).Equal(*proj.ProjectedOverrun))
	assert.True(t, decimal.Zero.Equal(*proj.ProjectedRemaining))
}

func TestProjectAccountBudget_TimingVsFullMonthSamples(t *testing.T) {
	// P1 scenario:
	// 6 historical completed months with ledger expense data.
	// Food spend in those months: 5k, 0, 6k, 0, 5k, 6k.
	// The two zero months are represented in the ledger and must be included in the full-month median.
	// Full-month spends: [0, 0, 5000, 5000, 6000, 6000] -> median is (5000+5000)/2 = 5000.
	// But timing samples (spend > 0): 4 samples.
	// When observed spend is ₹0 (e.g. early in month), fallback to historical full-month median = 5,000 (not 5,500).

	asOf := parseTestDate("2026-09-02")
	budget := AccountBudget{
		Account:  "Expenses:Food",
		Forecast: decimal.NewFromInt(8000),
		Actual:   decimal.Zero,
		Rollover: decimal.Zero,
	}
	observed := decimal.Zero

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-03-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(5000), SpendThroughAsOfDay: decimal.Zero},
		{Month: parseTestDate("2026-04-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.Zero, SpendThroughAsOfDay: decimal.Zero},
		{Month: parseTestDate("2026-05-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(6000), SpendThroughAsOfDay: decimal.Zero},
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.Zero, SpendThroughAsOfDay: decimal.Zero},
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(5000), SpendThroughAsOfDay: decimal.Zero},
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(6000), SpendThroughAsOfDay: decimal.Zero},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	// Full-month median including zeros is 5000.
	assert.True(t, decimal.NewFromInt(5000).Equal(*proj.ProjectedSpend))
	assert.Equal(t, BudgetProjectionSourceHistoricalMedian, proj.Source)
	assert.Equal(t, 6, proj.HistoricalSampleCount)
	assert.Equal(t, BudgetProjectionStatusOnTrack, proj.Status)
}

func TestProjectAccountBudget_HistoricalTiming_EvenSpend(t *testing.T) {
	// Acceptance Example A: Early Overspending
	// Today: Sep 06 (elapsed 6, days 30)
	// Budget: 10,000, Spent: 5,000, Available: 5,000.
	// Historical timing: ~28% of monthly spend occurred by day 6.
	// Projection: 5,000 / 0.28 = 17,857.14.
	// Likely over budget, overrun = 7,857.14.

	asOf := parseTestDate("2026-09-06")
	budget := AccountBudget{
		Account:  "Expenses:Food",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(5000),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(5000)

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(2800)},
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(2800)},
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(2800)},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	expectedSpend := decimal.NewFromInt(5000).Div(decimal.NewFromFloat(0.28))
	assert.True(t, expectedSpend.Equal(*proj.ProjectedSpend))
	assert.Equal(t, BudgetProjectionStatusLikelyOver, proj.Status)
	assert.Equal(t, BudgetProjectionSourceHistoricalTiming, proj.Source)
	expectedOverrun := expectedSpend.Sub(decimal.NewFromInt(10000))
	assert.True(t, expectedOverrun.Equal(*proj.ProjectedOverrun))
	assert.True(t, decimal.Zero.Equal(*proj.ProjectedRemaining))
}

func TestProjectAccountBudget_HistoricalTiming_LateSafe(t *testing.T) {
	// Acceptance Example B: Late Safe
	// Today: Sep 28
	// Budget: 10,000, Spent: 8,700.
	// Historical timing: ~97% of monthly spend occurred by day 28.
	// Projection: 8,700 / 0.97 = 8,969.07 -> On track.

	asOf := parseTestDate("2026-09-28")
	budget := AccountBudget{
		Account:  "Expenses:Food",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(8700),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(8700)

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(9700)},
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(9700)},
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(9700)},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	assert.Equal(t, BudgetProjectionStatusOnTrack, proj.Status)
	assert.True(t, proj.ProjectedSpend.LessThan(decimal.NewFromInt(9500)))
	assert.True(t, proj.ProjectedRemaining.IsPositive())
	assert.True(t, decimal.Zero.Equal(*proj.ProjectedOverrun))
}

func TestProjectAccountBudget_EarlyMonthlyBill_Rent(t *testing.T) {
	// Rent: 20,000 paid by day 2.
	// In history, rent is 100% paid by day 2.
	// Naive calendar pace would project: 20,000 / 2 * 30 = 300,000.
	// Historical timing projects: 20,000 / 1.0 = 20,000 -> On track.

	asOf := parseTestDate("2026-09-02")
	budget := AccountBudget{
		Account:  "Expenses:Rent",
		Forecast: decimal.NewFromInt(20000),
		Actual:   decimal.NewFromInt(20000),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(20000)

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(20000), SpendThroughAsOfDay: decimal.NewFromInt(20000)},
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(20000), SpendThroughAsOfDay: decimal.NewFromInt(20000)},
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(20000), SpendThroughAsOfDay: decimal.NewFromInt(20000)},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	assert.True(t, decimal.NewFromInt(20000).Equal(*proj.ProjectedSpend))
	assert.Equal(t, BudgetProjectionSourceHistoricalTiming, proj.Source)
	// 20,000 / 20,000 = 100% -> at-risk (between 95% and 105%)
	assert.Equal(t, BudgetProjectionStatusAtRisk, proj.Status)
}

func TestProjectAccountBudget_MinProgressShareFallback(t *testing.T) {
	// If historical progress share is very small (< 5%), e.g. 1%, dividing by it explodes.
	// Must fallback to historical full-month median.

	asOf := parseTestDate("2026-09-01")
	budget := AccountBudget{
		Account:  "Expenses:Shopping",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(500),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(500)

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(5000), SpendThroughAsOfDay: decimal.NewFromInt(50)}, // 1%
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(5000), SpendThroughAsOfDay: decimal.NewFromInt(50)}, // 1%
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(5000), SpendThroughAsOfDay: decimal.NewFromInt(50)}, // 1%
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	// Should fallback to median full-month spend (5000), NOT 500 / 0.01 = 50,000!
	assert.True(t, decimal.NewFromInt(5000).Equal(*proj.ProjectedSpend))
	assert.Equal(t, BudgetProjectionSourceHistoricalMedian, proj.Source)
	assert.Equal(t, BudgetProjectionStatusOnTrack, proj.Status)
}

func TestProjectAccountBudget_CalendarPaceFallback(t *testing.T) {
	// < 3 historical samples, elapsed >= 3 -> calendar pace
	asOf := parseTestDate("2026-09-05") // elapsed = 5, days = 30
	budget := AccountBudget{
		Account:  "Expenses:NewCategory",
		Forecast: decimal.NewFromInt(6000),
		Actual:   decimal.NewFromInt(1000),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(1000)

	// No history
	var history []BudgetHistoryMonth

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	// 1000 / 5 * 30 = 6000
	assert.True(t, decimal.NewFromInt(6000).Equal(*proj.ProjectedSpend))
	assert.Equal(t, BudgetProjectionSourceCalendarPace, proj.Source)
	assert.Equal(t, 0, proj.HistoricalSampleCount)
	// 6000 / 6000 = 100% -> at-risk
	assert.Equal(t, BudgetProjectionStatusAtRisk, proj.Status)
}

func TestProjectAccountBudget_InsufficientData_EarlyMonth(t *testing.T) {
	// < 3 historical samples, elapsed < 3 -> insufficient-data
	asOf := parseTestDate("2026-09-02") // elapsed = 2
	budget := AccountBudget{
		Account:  "Expenses:NewCategory",
		Forecast: decimal.NewFromInt(6000),
		Actual:   decimal.NewFromInt(1000),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(1000)

	var history []BudgetHistoryMonth

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	assert.Nil(t, proj.ProjectedSpend)
	assert.Equal(t, BudgetProjectionStatusInsufficientData, proj.Status)
	assert.Equal(t, BudgetProjectionSourceInsufficientData, proj.Source)
}

func TestProjectAccountBudget_RolloverEffectiveBudget(t *testing.T) {
	// Budget: 10,000, Rollover: 2,000 -> Effective: 12,000.
	// Actual: 10,500, Projected: 11,200.
	// Since 11,200 < 12,000 * 0.95 (11,400), it is On track!
	// Must not flag overspent simply because 10,500 > 10,000 forecast.

	asOf := parseTestDate("2026-09-15") // day 15
	budget := AccountBudget{
		Account:  "Expenses:Travel",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(10500),
		Rollover: decimal.NewFromInt(2000),
	}
	observed := decimal.NewFromInt(10500)

	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(11200), SpendThroughAsOfDay: decimal.NewFromInt(10500)},
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(11200), SpendThroughAsOfDay: decimal.NewFromInt(10500)},
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(11200), SpendThroughAsOfDay: decimal.NewFromInt(10500)},
	}

	proj := ProjectAccountBudget(budget, observed, history, asOf)

	require.NotNil(t, proj.ProjectedSpend)
	assert.True(t, decimal.NewFromInt(12000).Equal(proj.EffectiveBudget))
	assert.Equal(t, BudgetProjectionStatusOnTrack, proj.Status)
}

func TestProjectAccountBudget_AlreadyOverspent(t *testing.T) {
	// Effective budget: 5,000. Actual: 5,700.
	// Must immediately be classified as Overspent regardless of projection.

	asOf := parseTestDate("2026-09-10")
	budget := AccountBudget{
		Account:  "Expenses:Dining",
		Forecast: decimal.NewFromInt(5000),
		Actual:   decimal.NewFromInt(5700),
		Rollover: decimal.Zero,
	}
	observed := decimal.NewFromInt(5700)

	proj := ProjectAccountBudget(budget, observed, nil, asOf)

	assert.Equal(t, BudgetProjectionStatusOverspent, proj.Status)
	require.NotNil(t, proj.ProjectedSpend)
	assert.True(t, decimal.NewFromInt(17100).Equal(*proj.ProjectedSpend))
	require.NotNil(t, proj.ProjectedOverrun)
	// Projected overrun = 17,100 - 5,000 = 12,100
	assert.True(t, decimal.NewFromInt(12100).Equal(*proj.ProjectedOverrun))
	assert.True(t, decimal.Zero.Equal(*proj.ProjectedRemaining))

	// Also test when pacing data is insufficient (< 3 days), overspent is still flagged with overrun = 5700 - 5000 = 700
	asOfEarly := parseTestDate("2026-09-02")
	projEarly := ProjectAccountBudget(budget, observed, nil, asOfEarly)
	assert.Equal(t, BudgetProjectionStatusOverspent, projEarly.Status)
	require.NotNil(t, projEarly.ProjectedOverrun)
	assert.True(t, decimal.NewFromInt(700).Equal(*projEarly.ProjectedOverrun))
}

func TestProjectAccountBudget_ExactThresholdBoundaries(t *testing.T) {
	// Effective budget: 10,000.
	// Actual spend: 5,000 (well within budget).
	// History: 50% of spending occurs by day 15.
	// We test projectedSpend ratios against effective budget:
	// 94.99% (9,499) -> on-track (< 95%)
	// 95.00% (9,500) -> at-risk (>= 95%)
	// 100.00% (10,000) -> at-risk
	// 105.00% (10,500) -> at-risk (<= 105%)
	// 105.01% (10,501) -> likely-over (> 105%)

	asOf := parseTestDate("2026-09-15")
	history := []BudgetHistoryMonth{
		{Month: parseTestDate("2026-08-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(5000)}, // 50%
		{Month: parseTestDate("2026-07-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(5000)}, // 50%
		{Month: parseTestDate("2026-06-01"), MonthHasExpenseData: true, FullMonthSpend: decimal.NewFromInt(10000), SpendThroughAsOfDay: decimal.NewFromInt(5000)}, // 50%
	}

	testCases := []struct {
		name           string
		observed       decimal.Decimal
		expectedStatus BudgetProjectionStatus
	}{
		{"94.99% on-track", decimal.NewFromFloat(4749.5), BudgetProjectionStatusOnTrack},
		{"95.00% at-risk", decimal.NewFromFloat(4750.0), BudgetProjectionStatusAtRisk},
		{"100.00% at-risk (exact budget)", decimal.NewFromFloat(5000.0), BudgetProjectionStatusAtRisk},
		{"105.00% at-risk", decimal.NewFromFloat(5250.0), BudgetProjectionStatusAtRisk},
		{"105.01% likely-over", decimal.NewFromFloat(5250.5), BudgetProjectionStatusLikelyOver},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			budget := AccountBudget{
				Account:  "Expenses:Test",
				Forecast: decimal.NewFromInt(10000),
				Actual:   tc.observed,
				Rollover: decimal.Zero,
			}
			proj := ProjectAccountBudget(budget, tc.observed, history, asOf)
			assert.Equal(t, tc.expectedStatus, proj.Status)
		})
	}

	// Test boundary: projection == effectiveBudget (10,000 projected out of 10,000)
	// On day 30 (last day of month), 10,000 spent out of 10,000 projects 10,000 -> at-risk (100%)
	asOfLastDay := parseTestDate("2026-09-30")
	budgetExact := AccountBudget{
		Account:  "Expenses:Exact",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(10000),
		Rollover: decimal.Zero,
	}
	projExact := ProjectAccountBudget(budgetExact, decimal.NewFromInt(10000), nil, asOfLastDay)
	assert.Equal(t, BudgetProjectionStatusAtRisk, projExact.Status)

	// Test boundary: actual > effectiveBudget (10,001 spent out of 10,000)
	budgetOver := AccountBudget{
		Account:  "Expenses:Over",
		Forecast: decimal.NewFromInt(10000),
		Actual:   decimal.NewFromInt(10001),
		Rollover: decimal.Zero,
	}
	projOver := ProjectAccountBudget(budgetOver, decimal.NewFromInt(10001), nil, asOf)
	assert.Equal(t, BudgetProjectionStatusOverspent, projOver.Status)
}

func TestProjectAccountBudget_LeapYearAndDateBoundaries(t *testing.T) {
	// Leap year Feb 29
	asOfFeb29 := parseTestDate("2024-02-29")
	budget := AccountBudget{
		Account:  "Expenses:Food",
		Forecast: decimal.NewFromInt(2900),
		Actual:   decimal.NewFromInt(2900),
	}
	proj := ProjectAccountBudget(budget, decimal.NewFromInt(2900), nil, asOfFeb29)
	assert.Equal(t, 29, proj.ElapsedDays)
	assert.Equal(t, 29, proj.DaysInMonth)
	assert.Equal(t, BudgetProjectionStatusAtRisk, proj.Status) // 100% of budget

	// Non-leap year Feb 28
	asOfFeb28 := parseTestDate("2023-02-28")
	proj2 := ProjectAccountBudget(budget, decimal.NewFromInt(2900), nil, asOfFeb28)
	assert.Equal(t, 28, proj2.ElapsedDays)
	assert.Equal(t, 28, proj2.DaysInMonth)
}

func TestComputeBudgetOutlook(t *testing.T) {
	spent1 := decimal.NewFromInt(1000)
	overrun := decimal.NewFromInt(500)
	budgets := []AccountBudget{
		{
			Account: "Food",
			Projection: &AccountBudgetProjection{
				Status:           BudgetProjectionStatusOnTrack,
				EffectiveBudget:  decimal.NewFromInt(10000),
				ProjectedSpend:   &spent1,
				ProjectedOverrun: &decimal.Zero,
			},
		},
		{
			Account: "Transport",
			Projection: &AccountBudgetProjection{
				Status:           BudgetProjectionStatusLikelyOver,
				EffectiveBudget:  decimal.NewFromInt(5000),
				ProjectedSpend:   &spent1,
				ProjectedOverrun: &overrun,
			},
		},
		{
			Account: "NoBudgetAccount",
			Projection: &AccountBudgetProjection{
				Status:          BudgetProjectionStatusNoBudget,
				EffectiveBudget: decimal.Zero,
			},
		},
	}

	outlook := ComputeBudgetOutlook(budgets)
	require.NotNil(t, outlook)
	assert.Equal(t, 2, outlook.TotalBudgets, "Only positive effective budget accounts count")
	assert.Equal(t, 2, outlook.CoverageCount)
	assert.Equal(t, 1, outlook.OnTrackCount)
	assert.Equal(t, 1, outlook.LikelyOverCount)
	require.NotNil(t, outlook.ProjectedOverrun)
	assert.True(t, decimal.NewFromInt(500).Equal(*outlook.ProjectedOverrun))
}
