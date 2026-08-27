package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type CreditCardBillResponse struct {
	StatementStartDate time.Time             `json:"statementStartDate"`
	StatementEndDate   time.Time             `json:"statementEndDate"`
	DueDate            time.Time             `json:"dueDate"`
	PaidDate           *time.Time            `json:"paidDate"`
	Credits            decimal.Decimal       `json:"credits"`
	Debits             decimal.Decimal       `json:"debits"`
	OpeningBalance     decimal.Decimal       `json:"openingBalance"`
	ClosingBalance     decimal.Decimal       `json:"closingBalance"`
	Postings           []PostingResponse     `json:"postings"`
	Transactions       []TransactionResponse `json:"transactions"`
}

type CreditCardSummaryResponse struct {
	Account        string                                `json:"account"`
	Network        string                                `json:"network"`
	Number         string                                `json:"number"`
	Balance        decimal.Decimal                       `json:"balance"`
	Bills          []CreditCardBillResponse              `json:"bills"`
	CreditLimit    decimal.Decimal                       `json:"creditLimit"`
	YearlySpends   map[string]map[string]decimal.Decimal `json:"yearlySpends"`
	ExpirationDate time.Time                             `json:"expirationDate"`
}

type CreditCardsResponse struct {
	CreditCards []CreditCardSummaryResponse `json:"creditCards"`
}
