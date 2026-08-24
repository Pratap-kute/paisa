package dto

type DashboardResponse struct {
	CheckingBalances     interface{}                     `json:"checkingBalances"`
	Networth             CurrentNetworthResponse         `json:"networth"`
	Expenses             PeriodicPostingsSummaryResponse `json:"expenses"`
	CashFlows            CashFlowResponse                `json:"cashFlows"`
	TransactionSequences []TransactionSequenceResponse   `json:"transactionSequences"`
	Transactions         []TransactionResponse           `json:"transactions"`
	Budget               BudgetResponse                  `json:"budget"`
	GoalSummaries        []GoalSummaryResponse           `json:"goalSummaries"`
}
