package dto

type DashboardResponse struct {
	CheckingBalances     any                             `json:"checkingBalances"`
	Networth             CurrentNetworthResponse         `json:"networth"`
	Expenses             PeriodicPostingsSummaryResponse `json:"expenses"`
	CashFlows            []CashFlowResponse              `json:"cashFlows"`
	TransactionSequences []TransactionSequenceResponse   `json:"transactionSequences"`
	Transactions         []TransactionResponse           `json:"transactions"`
	Budget               BudgetsSummaryResponse          `json:"budget"`
	GoalSummaries        []GoalSummaryResponse           `json:"goalSummaries"`
}
