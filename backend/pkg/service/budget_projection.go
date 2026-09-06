package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
)

type BudgetProjectionStatus string

const (
	BudgetProjectionStatusNoBudget         BudgetProjectionStatus = "no-budget"
	BudgetProjectionStatusInsufficientData BudgetProjectionStatus = "insufficient-data"
	BudgetProjectionStatusOnTrack          BudgetProjectionStatus = "on-track"
	BudgetProjectionStatusAtRisk           BudgetProjectionStatus = "at-risk"
	BudgetProjectionStatusLikelyOver       BudgetProjectionStatus = "likely-over"
	BudgetProjectionStatusOverspent        BudgetProjectionStatus = "overspent"
)

type BudgetProjectionSource string

const (
	BudgetProjectionSourceHistoricalTiming BudgetProjectionSource = "historical-timing"
	BudgetProjectionSourceHistoricalMedian BudgetProjectionSource = "historical-median"
	BudgetProjectionSourceCalendarPace     BudgetProjectionSource = "calendar-pace"
	BudgetProjectionSourceInsufficientData BudgetProjectionSource = "insufficient-data"
)

const (
	MinHistoricalSampleCount      = 3
	MinElapsedDaysForCalendarPace = 3
	MinHistoricalProgressShare    = 0.05 // 5%
	LikelyOverThresholdRatio      = 1.05 // > 105% of effective budget
	AtRiskThresholdRatio          = 0.95 // >= 95% of effective budget
)

// BudgetHistoryMonth captures spending facts for a single completed historical month.
type BudgetHistoryMonth struct {
	Month               time.Time
	MonthHasExpenseData bool
	FullMonthSpend      decimal.Decimal
	SpendThroughAsOfDay decimal.Decimal
}

// AccountBudgetProjection contains deterministic month-end projection analytics for a budget envelope.
type AccountBudgetProjection struct {
	Status                BudgetProjectionStatus `json:"status"`
	EffectiveBudget       decimal.Decimal        `json:"effectiveBudget"`
	ObservedSpend         decimal.Decimal        `json:"observedSpend"`
	ProjectedSpend        *decimal.Decimal       `json:"projectedSpend,omitempty"`
	ProjectedOverrun      *decimal.Decimal       `json:"projectedOverrun,omitempty"`
	ProjectedRemaining    *decimal.Decimal       `json:"projectedRemaining,omitempty"`
	ProjectedUsageRatio   *decimal.Decimal       `json:"projectedUsageRatio,omitempty"`
	Source                BudgetProjectionSource `json:"source"`
	HistoricalSampleCount int                    `json:"historicalSampleCount"`
	ElapsedDays           int                    `json:"elapsedDays"`
	DaysInMonth           int                    `json:"daysInMonth"`
}

// BudgetOutlook aggregates active month envelope statuses and overrun metrics across categories.
type BudgetOutlook struct {
	OnTrackCount      int              `json:"onTrackCount"`
	AtRiskCount       int              `json:"atRiskCount"`
	LikelyOverCount   int              `json:"likelyOverCount"`
	OverspentCount    int              `json:"overspentCount"`
	InsufficientCount int              `json:"insufficientCount"`
	TotalBudgets      int              `json:"totalBudgets"`
	CoverageCount     int              `json:"coverageCount"`
	ProjectedOverrun  *decimal.Decimal `json:"projectedOverrun,omitempty"`
}

// ProjectAccountBudget computes the deterministic spending projection and health classification for an account budget.
// It explicitly distinguishes observedSpend (expenses dated <= asOf) from accountBudget.Actual (which may contain
// future-dated ordinary postings in the current month).
func ProjectAccountBudget(
	accountBudget AccountBudget,
	observedSpend decimal.Decimal,
	history []BudgetHistoryMonth,
	asOf time.Time,
) AccountBudgetProjection {
	elapsedDays := asOf.Day()
	daysInMonth := utils.EndOfMonth(asOf).Day()
	if elapsedDays < 1 {
		elapsedDays = 1
	}
	if elapsedDays > daysInMonth {
		elapsedDays = daysInMonth
	}

	effectiveBudget := accountBudget.Forecast
	if accountBudget.Rollover.IsPositive() {
		effectiveBudget = effectiveBudget.Add(accountBudget.Rollover)
	}

	// Case 1: No positive budget capacity configured
	if effectiveBudget.LessThanOrEqual(decimal.Zero) {
		if accountBudget.Actual.IsPositive() {
			actualCopy := accountBudget.Actual
			overrun := accountBudget.Actual.Sub(effectiveBudget)
			return AccountBudgetProjection{
				Status:                BudgetProjectionStatusOverspent,
				EffectiveBudget:       effectiveBudget,
				ObservedSpend:         observedSpend,
				ProjectedSpend:        &actualCopy,
				ProjectedOverrun:      &overrun,
				ProjectedRemaining:    nil,
				ProjectedUsageRatio:   nil,
				Source:                BudgetProjectionSourceInsufficientData,
				HistoricalSampleCount: 0,
				ElapsedDays:           elapsedDays,
				DaysInMonth:           daysInMonth,
			}
		}
		return AccountBudgetProjection{
			Status:                BudgetProjectionStatusNoBudget,
			EffectiveBudget:       effectiveBudget,
			ObservedSpend:         observedSpend,
			ProjectedSpend:        nil,
			ProjectedOverrun:      nil,
			ProjectedRemaining:    nil,
			ProjectedUsageRatio:   nil,
			Source:                BudgetProjectionSourceInsufficientData,
			HistoricalSampleCount: 0,
			ElapsedDays:           elapsedDays,
			DaysInMonth:           daysInMonth,
		}
	}

	// Case 2: Determine pacing projection based on observedSpend
	var paceProjection *decimal.Decimal
	source := BudgetProjectionSourceInsufficientData
	historicalSampleCount := 0

	// 2.1 Timing samples: months where FullMonthSpend > 0
	timingShares := make([]decimal.Decimal, 0, len(history))
	for _, h := range history {
		if h.FullMonthSpend.IsPositive() {
			share := h.SpendThroughAsOfDay.Div(h.FullMonthSpend)
			if share.IsNegative() {
				share = decimal.Zero
			}
			timingShares = append(timingShares, share)
		}
	}

	// 2.2 Full-month samples: months with verified ledger expense data (including represented ₹0 category spend)
	fullMonthSpends := make([]decimal.Decimal, 0, len(history))
	for _, h := range history {
		if h.MonthHasExpenseData {
			fullMonthSpends = append(fullMonthSpends, h.FullMonthSpend)
		}
	}

	if observedSpend.IsPositive() && len(timingShares) >= MinHistoricalSampleCount {
		medianShare := Median(timingShares)
		minShare := decimal.NewFromFloat(MinHistoricalProgressShare)
		if medianShare.GreaterThanOrEqual(minShare) {
			proj := observedSpend.Div(medianShare)
			paceProjection = &proj
			source = BudgetProjectionSourceHistoricalTiming
			historicalSampleCount = len(timingShares)
		} else if len(fullMonthSpends) >= MinHistoricalSampleCount {
			// Median share < 5% -> fallback to historical full-month median to prevent exploding projection
			medianSpend := Median(fullMonthSpends)
			proj := decimal.Max(observedSpend, medianSpend)
			paceProjection = &proj
			source = BudgetProjectionSourceHistoricalMedian
			historicalSampleCount = len(fullMonthSpends)
		}
	} else if observedSpend.IsZero() && len(fullMonthSpends) >= MinHistoricalSampleCount {
		// Category normally occurs later in month: observed is ₹0, but historical full months had spend
		medianSpend := Median(fullMonthSpends)
		paceProjection = &medianSpend
		source = BudgetProjectionSourceHistoricalMedian
		historicalSampleCount = len(fullMonthSpends)
	}

	// 2.3 Calendar pace fallback
	if paceProjection == nil {
		if elapsedDays >= MinElapsedDaysForCalendarPace {
			proj := observedSpend.Div(decimal.NewFromInt(int64(elapsedDays))).Mul(decimal.NewFromInt(int64(daysInMonth)))
			paceProjection = &proj
			source = BudgetProjectionSourceCalendarPace
			historicalSampleCount = 0
		} else {
			source = BudgetProjectionSourceInsufficientData
			historicalSampleCount = 0
		}
	}

	// Safety clamping: projection can never be below known Actual (including future-dated ordinary postings)
	var finalProjectedSpend *decimal.Decimal
	if paceProjection != nil {
		proj := *paceProjection
		if proj.LessThan(accountBudget.Actual) {
			proj = accountBudget.Actual
		}
		if proj.IsNegative() {
			proj = decimal.Zero
		}
		finalProjectedSpend = &proj
	} else if accountBudget.Actual.GreaterThan(effectiveBudget) {
		// Even with insufficient pacing data, if actual already exceeds effective budget, it's definitively overspent
		actualCopy := accountBudget.Actual
		finalProjectedSpend = &actualCopy
	}

	// Health status determination
	var status BudgetProjectionStatus
	var projectedOverrun *decimal.Decimal
	var projectedRemaining *decimal.Decimal
	var projectedUsageRatio *decimal.Decimal

	switch {
	case accountBudget.Actual.GreaterThan(effectiveBudget):
		status = BudgetProjectionStatusOverspent
		overrun := accountBudget.Actual.Sub(effectiveBudget)
		projectedOverrun = &overrun
		rem := decimal.Zero
		projectedRemaining = &rem
		if finalProjectedSpend != nil {
			ratio := finalProjectedSpend.Div(effectiveBudget)
			projectedUsageRatio = &ratio
			if finalProjectedSpend.GreaterThan(accountBudget.Actual) {
				projOverrun := finalProjectedSpend.Sub(effectiveBudget)
				projectedOverrun = &projOverrun
			}
		} else {
			ratio := accountBudget.Actual.Div(effectiveBudget)
			projectedUsageRatio = &ratio
		}
	case finalProjectedSpend == nil:
		status = BudgetProjectionStatusInsufficientData
	default:
		ratio := finalProjectedSpend.Div(effectiveBudget)
		projectedUsageRatio = &ratio

		if finalProjectedSpend.GreaterThan(effectiveBudget) {
			overrun := finalProjectedSpend.Sub(effectiveBudget)
			projectedOverrun = &overrun
			rem := decimal.Zero
			projectedRemaining = &rem
		} else {
			overrun := decimal.Zero
			projectedOverrun = &overrun
			rem := effectiveBudget.Sub(*finalProjectedSpend)
			projectedRemaining = &rem
		}

		likelyOverLimit := effectiveBudget.Mul(decimal.NewFromFloat(LikelyOverThresholdRatio))
		atRiskLimit := effectiveBudget.Mul(decimal.NewFromFloat(AtRiskThresholdRatio))

		switch {
		case finalProjectedSpend.GreaterThan(likelyOverLimit):
			status = BudgetProjectionStatusLikelyOver
		case finalProjectedSpend.GreaterThanOrEqual(atRiskLimit):
			status = BudgetProjectionStatusAtRisk
		default:
			status = BudgetProjectionStatusOnTrack
		}
	}

	return AccountBudgetProjection{
		Status:                status,
		EffectiveBudget:       effectiveBudget,
		ObservedSpend:         observedSpend,
		ProjectedSpend:        finalProjectedSpend,
		ProjectedOverrun:      projectedOverrun,
		ProjectedRemaining:    projectedRemaining,
		ProjectedUsageRatio:   projectedUsageRatio,
		Source:                source,
		HistoricalSampleCount: historicalSampleCount,
		ElapsedDays:           elapsedDays,
		DaysInMonth:           daysInMonth,
	}
}

// ComputeBudgetOutlook calculates an aggregate summary across all active envelope budgets.
func ComputeBudgetOutlook(accountBudgets []AccountBudget) *BudgetOutlook {
	if len(accountBudgets) == 0 {
		return nil
	}

	outlook := &BudgetOutlook{}
	totalOverrun := decimal.Zero
	hasOverrun := false

	for i := range accountBudgets {
		b := &accountBudgets[i]
		if b.Projection == nil {
			continue
		}

		// Only envelopes with positive effective budget count toward total budget envelopes
		if b.Projection.EffectiveBudget.IsPositive() {
			outlook.TotalBudgets++
		}

		switch b.Projection.Status {
		case BudgetProjectionStatusOnTrack:
			outlook.OnTrackCount++
			outlook.CoverageCount++
		case BudgetProjectionStatusAtRisk:
			outlook.AtRiskCount++
			outlook.CoverageCount++
		case BudgetProjectionStatusLikelyOver:
			outlook.LikelyOverCount++
			outlook.CoverageCount++
		case BudgetProjectionStatusOverspent:
			outlook.OverspentCount++
			outlook.CoverageCount++
		case BudgetProjectionStatusInsufficientData:
			outlook.InsufficientCount++
		case BudgetProjectionStatusNoBudget:
			// Not an active budget envelope with capacity
		}

		if b.Projection.ProjectedOverrun != nil && b.Projection.ProjectedOverrun.IsPositive() {
			totalOverrun = totalOverrun.Add(*b.Projection.ProjectedOverrun)
			hasOverrun = true
		}
	}

	if hasOverrun {
		outlook.ProjectedOverrun = &totalOverrun
	}

	return outlook
}
