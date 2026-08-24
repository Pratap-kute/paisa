package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type PostingResponse struct {
	ID                   uint            `json:"id"`
	TransactionID        string          `json:"transaction_id"`
	Date                 time.Time       `json:"date"`
	Payee                string          `json:"payee"`
	Account              string          `json:"account"`
	Commodity            string          `json:"commodity"`
	Quantity             decimal.Decimal `json:"quantity"`
	Amount               decimal.Decimal `json:"amount"`
	Status               string          `json:"status"`
	TagRecurring         string          `json:"tag_recurring"`
	TagPeriod            string          `json:"tag_period"`
	TransactionBeginLine uint64          `json:"transaction_begin_line"`
	TransactionEndLine   uint64          `json:"transaction_end_line"`
	FileName             string          `json:"file_name"`
	Forecast             bool            `json:"forecast"`
	Note                 string          `json:"note"`
	TransactionNote      string          `json:"transaction_note"`
	MarketAmount         decimal.Decimal `json:"market_amount"`
	Balance              decimal.Decimal `json:"balance"`
}

type PostingsResponse struct {
	Postings []PostingResponse `json:"postings"`
}
