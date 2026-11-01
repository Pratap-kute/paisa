package service

import (
	"math"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var goalAsOf = time.Date(2026, time.September, 5, 0, 0, 0, 0, time.UTC)

func goalMonths(amount float64, months ...string) []GoalContribution {
	history := make([]GoalContribution, 0, len(months))
	for _, m := range months {
		history = append(history, GoalContribution{Month: m, Amount: amount})
	}
	return history
}

func baseGoal() GoalInput {
	return GoalInput{
		Type:                "savings",
		Current:             240000,
		Target:              600000,
		TargetDate:          "2027-03-31",
		ContributionHistory: goalMonths(60000, "2026-06", "2026-07", "2026-08"),
	}
}

func TestAnalyzeGoalUsesBeginningOfMonthFormulas(t *testing.T) {
	in := baseGoal()
	in.Rate = 7
	got := AnalyzeGoal(in, goalAsOf)
	require.NotNil(t, got.RequiredMonthlyContribution)
	assert.InDelta(t, goalPMT(7.0/1200, 6, in.Current, -in.Target), *got.RequiredMonthlyContribution, 1e-8)
	require.NotNil(t, got.AnnualReturn)
	assert.Equal(t, 7.0, *got.AnnualReturn)

	deadline := time.Date(2027, time.March, 31, 0, 0, 0, 0, time.UTC)
	required := requiredContribution(240000, 600000, 0, deadline, goalAsOf)
	require.NotNil(t, required)
	assert.Equal(t, 60000.0, *required)
}

func TestAnalyzeGoalPaceCoverageGapAndDelay(t *testing.T) {
	in := baseGoal()
	in.ContributionHistory = goalMonths(48000, "2026-06", "2026-07", "2026-08")
	got := AnalyzeGoal(in, goalAsOf)
	require.NotNil(t, got.ActualMonthlyContribution)
	assert.Equal(t, 48000.0, *got.ActualMonthlyContribution)
	assert.InDelta(t, 0.8, *got.PaceCoverage, 1e-12)
	assert.Equal(t, 12000.0, *got.PaceGap)
	assert.Equal(t, "behind", got.ScheduleStatus)
	require.NotNil(t, got.ProjectedCompletionDate)
	assert.Equal(t, "2027-05-01", *got.ProjectedCompletionDate)
	require.NotNil(t, got.DelayMonths)
	assert.Equal(t, 2, *got.DelayMonths)
	assert.Equal(t, "warning", got.Attention)
}

func TestClassifyGoalSchedule(t *testing.T) {
	cases := []struct {
		coverage float64
		want     string
	}{
		{1, "on-track"}, {0.95, "on-track"}, {0.94999, "behind"}, {0.75, "behind"},
		{0.74999, "at-risk"}, {0, "at-risk"}, {-1, "at-risk"}, {math.NaN(), "insufficient-data"},
	}
	for _, c := range cases {
		assert.Equal(t, c.want, classifyGoalSchedule(c.coverage), "coverage %v", c.coverage)
	}
}

func TestGoalContributionPaceKeepsZeroMonthsAndSkipsCurrentMonth(t *testing.T) {
	pace := goalContributionPace([]GoalContribution{
		{"2026-06", 10000}, {"2026-07", 0}, {"2026-08", 10000},
		{"2026-09", 900000}, {"2025-01", 900000},
	}, goalAsOf)
	assert.Equal(t, 3, pace.observed)
	assert.Equal(t, 2, pace.active)
	require.NotNil(t, pace.average)
	assert.InDelta(t, 20000.0/3, *pace.average, 1e-9)
}

func TestAnalyzeGoalCannotClassifyARecentLumpSum(t *testing.T) {
	for count := 0; count <= 2; count++ {
		in := baseGoal()
		in.ContributionHistory = goalMonths(1000000, "2026-06", "2026-07", "2026-08")[:count]
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "insufficient-data", got.ScheduleStatus)
		assert.Equal(t, "none", got.Attention)
		require.NotNil(t, got.RequiredMonthlyContribution)
		assert.Equal(t, 60000.0, *got.RequiredMonthlyContribution)
		assert.Nil(t, got.ProjectedCompletionDate)
	}
}

func TestAnalyzeGoalNoContributionsOrWithdrawalsAreAtRisk(t *testing.T) {
	for _, amount := range []float64{0, -20000} {
		in := baseGoal()
		in.ContributionHistory = goalMonths(amount, "2026-06", "2026-07", "2026-08")
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "at-risk", got.ScheduleStatus)
		assert.Nil(t, got.ProjectedCompletionDate)
	}
}

func TestAnalyzeGoalAssumedGrowthFundsTarget(t *testing.T) {
	in := baseGoal()
	in.Current, in.Rate, in.ContributionHistory = 590000, 10, nil
	got := AnalyzeGoal(in, goalAsOf)
	require.NotNil(t, got.RequiredMonthlyContribution)
	assert.Equal(t, 0.0, *got.RequiredMonthlyContribution)
	assert.Equal(t, "on-track", got.ScheduleStatus)
	assert.Equal(t, "none", got.Attention)
	assert.Nil(t, got.PaceCoverage)
	assert.Equal(t, "assumed-growth", got.ProjectionSource)
}

func TestAnalyzeGoalDistinguishesTodayFromYesterday(t *testing.T) {
	today := baseGoal()
	today.TargetDate = "2026-09-05"
	got := AnalyzeGoal(today, goalAsOf)
	assert.Equal(t, "active", got.State)
	require.NotNil(t, got.RequiredMonthlyContribution)
	assert.Equal(t, 360000.0, *got.RequiredMonthlyContribution)

	yesterday := baseGoal()
	yesterday.TargetDate = "2026-09-04"
	got = AnalyzeGoal(yesterday, goalAsOf)
	assert.Equal(t, "overdue", got.State)
	assert.Equal(t, "critical", got.Attention)
	assert.Nil(t, got.RequiredMonthlyContribution)
}

func TestAnalyzeGoalCompletionOverridesOverdueAndKeepsRawProgress(t *testing.T) {
	for _, current := range []float64{600000, 720000} {
		in := baseGoal()
		in.Current, in.TargetDate = current, "2020-01-01"
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "completed", got.State)
		assert.Equal(t, "none", got.Attention)
		assert.Equal(t, current/600000, got.ProgressRatio)
		assert.Equal(t, 0.0, got.RemainingAmount)
	}
}

func TestAnalyzeGoalNeverTurnsAPaymentIntoADeadline(t *testing.T) {
	for _, date := range []string{"", "invalid", "2026-02-30"} {
		in := baseGoal()
		in.TargetDate, in.PaymentPerPeriod, in.ContributionHistory = date, 15000, nil
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "no-deadline", got.ScheduleStatus, date)
		assert.Equal(t, "derived-from-payment", got.DeadlineSource, date)
		assert.Equal(t, "active", got.State, date)
		assert.Equal(t, "configured-payment", got.ProjectionSource, date)
		require.NotNil(t, got.ProjectedCompletionDate, date)
		assert.Equal(t, "2028-09", (*got.ProjectedCompletionDate)[:7], date)
	}
	in := baseGoal()
	in.TargetDate, in.PaymentPerPeriod = "", 0
	assert.Equal(t, "none", AnalyzeGoal(in, goalAsOf).DeadlineSource)
}

func TestAnalyzeGoalHandlesInvalidInputs(t *testing.T) {
	for _, target := range []float64{0, -1, math.NaN(), math.Inf(1)} {
		in := baseGoal()
		in.Target = target
		got := AnalyzeGoal(in, goalAsOf)
		assert.False(t, got.ValidTarget, "target %v", target)
		assert.Equal(t, "none", got.Attention)
		assert.False(t, math.IsNaN(got.ProgressRatio) || math.IsInf(got.ProgressRatio, 0))
	}
	for _, current := range []float64{math.NaN(), math.Inf(1)} {
		valid, _, _ := calculateGoalProgress(current, 600000)
		assert.False(t, valid)
	}
	_, ratio, remaining := calculateGoalProgress(-100, 100)
	assert.Equal(t, -1.0, ratio)
	assert.Equal(t, 200.0, remaining)

	for _, rate := range []float64{math.NaN(), math.Inf(1), -100, 1000} {
		in := baseGoal()
		in.Rate = rate
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "insufficient-data", got.ScheduleStatus, "rate %v", rate)
		assert.Nil(t, got.RequiredMonthlyContribution)
		assert.NotEmpty(t, got.Reasons)
	}
	assert.Nil(t, projectedCompletion(0, 600000, 0, 0, goalAsOf))
	assert.Nil(t, projectedCompletion(0, 600000, 0, 0.01, goalAsOf))
}

func TestAnalyzeGoalKeepsRetirementSeparateFromSavingsSchedules(t *testing.T) {
	for _, current := range []float64{240000, 600000, 720000} {
		in := baseGoal()
		in.Type, in.Current, in.TargetDate = "retirement", current, "2000-01-01"
		got := AnalyzeGoal(in, goalAsOf)
		assert.Equal(t, "no-deadline", got.ScheduleStatus)
		assert.Equal(t, "none", got.Attention)
		assert.Equal(t, "none", got.DeadlineSource)
		assert.Nil(t, got.RequiredMonthlyContribution)
		if current >= 600000 {
			assert.Equal(t, "completed", got.State)
		} else {
			assert.Equal(t, "active", got.State)
		}
	}
}
