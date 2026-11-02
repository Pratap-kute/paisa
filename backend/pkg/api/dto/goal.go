package dto

import "github.com/shopspring/decimal"

type GoalSummaryResponse struct {
	Type                string                   `json:"type"`
	Name                string                   `json:"name"`
	ID                  string                   `json:"id"`
	Icon                string                   `json:"icon"`
	Current             decimal.Decimal          `json:"current"`
	Target              decimal.Decimal          `json:"target"`
	TargetDate          string                   `json:"targetDate"`
	Priority            int                      `json:"priority"`
	ContributionHistory []GoalContributionMonth  `json:"contributionHistory,omitempty"`
	Rate                float64                  `json:"rate,omitempty"`
	PaymentPerPeriod    float64                  `json:"paymentPerPeriod,omitempty"`
	SWR                 float64                  `json:"swr,omitempty"`
	YearlyExpense       decimal.Decimal          `json:"yearlyExpense"`
	YearlyExpenseSource string                   `json:"yearlyExpenseSource,omitempty"`
	Intelligence        GoalIntelligenceResponse `json:"intelligence"`
}

// GoalIntelligenceResponse is the analysis of a goal: progress, the monthly
// contribution needed to meet its deadline, how the recent pace compares and
// when it is projected to finish. Dates are formatted YYYY-MM-DD.
type GoalIntelligenceResponse struct {
	ProgressRatio               float64  `json:"progressRatio"`
	RemainingAmount             float64  `json:"remainingAmount"`
	ValidTarget                 bool     `json:"validTarget"`
	RequiredMonthlyContribution *float64 `json:"requiredMonthlyContribution,omitempty"`
	ActualMonthlyContribution   *float64 `json:"actualMonthlyContribution,omitempty"`
	ContributionMonthsObserved  int      `json:"contributionMonthsObserved"`
	ActiveContributionMonths    int      `json:"activeContributionMonths"`
	PaceCoverage                *float64 `json:"paceCoverage,omitempty"`
	PaceGap                     *float64 `json:"paceGap,omitempty"`
	ProjectedCompletionDate     *string  `json:"projectedCompletionDate,omitempty"`
	ConfiguredCompletionDate    *string  `json:"configuredCompletionDate,omitempty"`
	ProjectionSource            string   `json:"projectionSource,omitempty"`
	DelayMonths                 *int     `json:"delayMonths,omitempty"`
	State                       string   `json:"state"`
	ScheduleStatus              string   `json:"scheduleStatus"`
	Attention                   string   `json:"attention"`
	DeadlineSource              string   `json:"deadlineSource"`
	TargetDate                  *string  `json:"targetDate,omitempty"`
	AnnualReturn                *float64 `json:"annualReturn,omitempty"`
	Reasons                     []string `json:"reasons"`
}

type GoalContributionMonth struct {
	Month  string          `json:"month"`
	Amount decimal.Decimal `json:"amount"`
}

type GoalSummariesResponse struct {
	Goals []GoalSummaryResponse `json:"goals"`
}

type GoalDetailResponse struct {
	Summary             GoalSummaryResponse     `json:"summary"`
	Timeline            map[string]any          `json:"timeline,omitempty"`
	ContributionHistory []GoalContributionMonth `json:"contributionHistory,omitempty"`
	Target              decimal.Decimal         `json:"target"`
	YearlyExpenseSource string                  `json:"yearlyExpenseSource,omitempty"`
}
