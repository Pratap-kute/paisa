package dto

import "github.com/shopspring/decimal"

type GoalSummaryResponse struct {
	Type                string                  `json:"type"`
	Name                string                  `json:"name"`
	ID                  string                  `json:"id"`
	Icon                string                  `json:"icon"`
	Current             decimal.Decimal         `json:"current"`
	Target              decimal.Decimal         `json:"target"`
	TargetDate          string                  `json:"targetDate"`
	Priority            int                     `json:"priority"`
	ContributionHistory []GoalContributionMonth `json:"contributionHistory,omitempty"`
	Rate                float64                 `json:"rate,omitempty"`
	PaymentPerPeriod    float64                 `json:"paymentPerPeriod,omitempty"`
	SWR                 float64                 `json:"swr,omitempty"`
	YearlyExpense       decimal.Decimal         `json:"yearlyExpense"`
	YearlyExpenseSource string                  `json:"yearlyExpenseSource,omitempty"`
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
