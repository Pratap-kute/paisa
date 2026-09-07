package dto

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
}
