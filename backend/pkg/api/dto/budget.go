package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type AccountBudgetResponse struct {
	Account   string            `json:"account"`
	Forecast  decimal.Decimal   `json:"forecast"`
	Actual    decimal.Decimal   `json:"actual"`
	Rollover  decimal.Decimal   `json:"rollover"`
	Available decimal.Decimal   `json:"available"`
	Date      time.Time         `json:"date"`
	Expenses  []PostingResponse `json:"expenses"`
}

type BudgetResponse struct {
	Date               time.Time               `json:"date"`
	Accounts           []AccountBudgetResponse `json:"accounts"`
	AvailableThisMonth decimal.Decimal         `json:"availableThisMonth"`
	EndOfMonthBalance  decimal.Decimal         `json:"endOfMonthBalance"`
	Forecast           decimal.Decimal         `json:"forecast"`
}

type BudgetsSummaryResponse struct {
	BudgetsByMonth        map[string]BudgetResponse `json:"budgetsByMonth"`
	CheckingBalance       decimal.Decimal           `json:"checkingBalance"`
	AvailableForBudgeting decimal.Decimal           `json:"availableForBudgeting"`
}
