package dto

import "github.com/shopspring/decimal"

type GoalSummaryResponse struct {
	Type       string          `json:"type"`
	Name       string          `json:"name"`
	ID         string          `json:"id"`
	Icon       string          `json:"icon"`
	Current    decimal.Decimal `json:"current"`
	Target     decimal.Decimal `json:"target"`
	TargetDate string          `json:"targetDate"`
	Priority   int             `json:"priority"`
}

type GoalSummariesResponse struct {
	GoalSummaries []GoalSummaryResponse `json:"goal_summaries"`
}
