package mapper

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/shopspring/decimal"
)

type DomainCreditCardBill struct {
	StatementStartDate   time.Time
	StatementEndDate     time.Time
	DueDate              time.Time
	PaidDate             *time.Time
	Credits              decimal.Decimal
	Debits               decimal.Decimal
	DebitsRunningBalance decimal.Decimal
	OpeningBalance       decimal.Decimal
	ClosingBalance       decimal.Decimal
	Postings             []posting.Posting
	Transactions         []transaction.Transaction
}

type DomainCreditCardSummary struct {
	Account        string
	Network        string
	Number         string
	Balance        decimal.Decimal
	Bills          []DomainCreditCardBill
	CreditLimit    decimal.Decimal
	YearlySpends   map[string]map[string]decimal.Decimal
	ExpirationDate time.Time
}

func CreditCardBillToDTO(b DomainCreditCardBill) dto.CreditCardBillResponse {
	return dto.CreditCardBillResponse{
		StatementStartDate: b.StatementStartDate,
		StatementEndDate:   b.StatementEndDate,
		DueDate:            b.DueDate,
		PaidDate:           b.PaidDate,
		Credits:            b.Credits,
		Debits:             b.Debits,
		OpeningBalance:     b.OpeningBalance,
		ClosingBalance:     b.ClosingBalance,
		Postings:           PostingsToDTO(b.Postings),
		Transactions:       TransactionsToDTO(b.Transactions),
	}
}

func CreditCardBillsToDTO(bills []DomainCreditCardBill) []dto.CreditCardBillResponse {
	if len(bills) == 0 {
		return []dto.CreditCardBillResponse{}
	}
	result := make([]dto.CreditCardBillResponse, len(bills))
	for i := range bills {
		result[i] = CreditCardBillToDTO(bills[i])
	}
	return result
}

func CreditCardSummaryToDTO(s DomainCreditCardSummary) dto.CreditCardSummaryResponse {
	return dto.CreditCardSummaryResponse{
		Account:        s.Account,
		Network:        s.Network,
		Number:         s.Number,
		Balance:        s.Balance,
		Bills:          CreditCardBillsToDTO(s.Bills),
		CreditLimit:    s.CreditLimit,
		YearlySpends:   s.YearlySpends,
		ExpirationDate: s.ExpirationDate,
	}
}

func CreditCardSummariesToDTO(cards []DomainCreditCardSummary) []dto.CreditCardSummaryResponse {
	if len(cards) == 0 {
		return []dto.CreditCardSummaryResponse{}
	}
	result := make([]dto.CreditCardSummaryResponse, len(cards))
	for i := range cards {
		result[i] = CreditCardSummaryToDTO(cards[i])
	}
	return result
}
