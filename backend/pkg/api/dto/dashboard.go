package dto

import "github.com/shopspring/decimal"

type DashboardResponse struct {
	InvestmentPerformance      *InvestmentPerformance          `json:"investmentPerformance" extensions:"x-nullable"`
	InvestmentPerformanceError *string                         `json:"investmentPerformanceError,omitempty" extensions:"x-nullable"`
	CheckingBalances           any                             `json:"checkingBalances"`
	Networth                   CurrentNetworthResponse         `json:"networth"`
	Expenses                   PeriodicPostingsSummaryResponse `json:"expenses"`
	CashFlows                  []CashFlowResponse              `json:"cashFlows"`
	TransactionSequences       []TransactionSequenceResponse   `json:"transactionSequences"`
	Transactions               []TransactionResponse           `json:"transactions"`
	Budget                     BudgetsSummaryResponse          `json:"budget"`
	GoalSummaries              []GoalSummaryResponse           `json:"goalSummaries"`
	ExpensePace                *ExpensePaceResponse            `json:"expensePace" extensions:"x-nullable"`
}

// ExpensePaceResponse projects the current month's spending at the pace so far.
type ExpensePaceResponse struct {
	Period            string          `json:"period"`
	ProjectedExpenses decimal.Decimal `json:"projectedExpenses"`
	// OverBudget is omitted when the projection is within the budget.
	OverBudget *decimal.Decimal `json:"overBudget,omitempty"`
}
