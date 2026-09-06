package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type AccountBudgetProjectionResponse struct {
	Status                string           `json:"status"`
	EffectiveBudget       decimal.Decimal  `json:"effectiveBudget"`
	ObservedSpend         decimal.Decimal  `json:"observedSpend"`
	ProjectedSpend        *decimal.Decimal `json:"projectedSpend,omitempty"`
	ProjectedOverrun      *decimal.Decimal `json:"projectedOverrun,omitempty"`
	ProjectedRemaining    *decimal.Decimal `json:"projectedRemaining,omitempty"`
	ProjectedUsageRatio   *decimal.Decimal `json:"projectedUsageRatio,omitempty"`
	Source                string           `json:"source"`
	HistoricalSampleCount int              `json:"historicalSampleCount"`
	ElapsedDays           int              `json:"elapsedDays"`
	DaysInMonth           int              `json:"daysInMonth"`
}

type BudgetOutlookResponse struct {
	OnTrackCount      int              `json:"onTrackCount"`
	AtRiskCount       int              `json:"atRiskCount"`
	LikelyOverCount   int              `json:"likelyOverCount"`
	OverspentCount    int              `json:"overspentCount"`
	InsufficientCount int              `json:"insufficientCount"`
	TotalBudgets      int              `json:"totalBudgets"`
	CoverageCount     int              `json:"coverageCount"`
	ProjectedOverrun  *decimal.Decimal `json:"projectedOverrun,omitempty"`
}

type AccountBudgetResponse struct {
	Account    string                           `json:"account"`
	Forecast   decimal.Decimal                  `json:"forecast"`
	Actual     decimal.Decimal                  `json:"actual"`
	Rollover   decimal.Decimal                  `json:"rollover"`
	Available  decimal.Decimal                  `json:"available"`
	Date       time.Time                        `json:"date"`
	Expenses   []PostingResponse                `json:"expenses"`
	Projection *AccountBudgetProjectionResponse `json:"projection,omitempty"`
}

type BudgetResponse struct {
	Date               time.Time               `json:"date"`
	Accounts           []AccountBudgetResponse `json:"accounts"`
	AvailableThisMonth decimal.Decimal         `json:"availableThisMonth"`
	EndOfMonthBalance  decimal.Decimal         `json:"endOfMonthBalance"`
	Forecast           decimal.Decimal         `json:"forecast"`
	Outlook            *BudgetOutlookResponse  `json:"outlook,omitempty"`
}

type BudgetsSummaryResponse struct {
	BudgetsByMonth        map[string]BudgetResponse `json:"budgetsByMonth"`
	CheckingBalance       decimal.Decimal           `json:"checkingBalance"`
	AvailableForBudgeting decimal.Decimal           `json:"availableForBudgeting"`
}
