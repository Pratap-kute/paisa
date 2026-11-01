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
	// Set for open commodity lots only (see service.ComputePostingReturn).
	UnrealizedGain *decimal.Decimal `json:"unrealized_gain,omitempty"`
	HoldingDays    *int             `json:"holding_days,omitempty"`
	// Compound annual rate in percent, omitted for lots held under a year.
	AnnualizedReturn *decimal.Decimal `json:"annualized_return,omitempty"`
}

type PostingsResponse struct {
	Postings []PostingResponse `json:"postings"`
}
