package dto

type TransactionSequenceResponse struct {
	Transactions []TransactionResponse `json:"transactions"`
	Key          string                `json:"key"`
	Period       string                `json:"period"`
	Interval     int                   `json:"interval"`
}

type RecurringTransactionsResponse struct {
	TransactionSequences []TransactionSequenceResponse `json:"transaction_sequences"`
}
