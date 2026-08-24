package dto

import (
	"time"
)

type TransactionResponse struct {
	ID           string            `json:"id"`
	Date         time.Time         `json:"date"`
	Payee        string            `json:"payee"`
	Postings     []PostingResponse `json:"postings"`
	TagRecurring string            `json:"tag_recurring"`
	TagPeriod    string            `json:"tag_period"`
	BeginLine    uint64            `json:"beginLine"`
	EndLine      uint64            `json:"endLine"`
	FileName     string            `json:"fileName"`
	Note         string            `json:"note"`
}

type TransactionsResponse struct {
	Transactions []TransactionResponse `json:"transactions"`
}

type BalancedPostingResponse struct {
	From PostingResponse `json:"from"`
	To   PostingResponse `json:"to"`
}

type BalancedPostingsResponse struct {
	BalancedPostings []BalancedPostingResponse `json:"balancedPostings"`
}
