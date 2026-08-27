package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
)

func TransactionToDTO(t transaction.Transaction) dto.TransactionResponse {
	return dto.TransactionResponse{
		ID:           t.ID,
		Date:         t.Date,
		Payee:        t.Payee,
		Postings:     PostingsToDTO(t.Postings),
		TagRecurring: t.TagRecurring,
		TagPeriod:    t.TagPeriod,
		BeginLine:    t.BeginLine,
		EndLine:      t.EndLine,
		FileName:     t.FileName,
		Note:         t.Note,
	}
}

func TransactionsToDTO(txs []transaction.Transaction) []dto.TransactionResponse {
	if len(txs) == 0 {
		return []dto.TransactionResponse{}
	}
	result := make([]dto.TransactionResponse, len(txs))
	for i := range txs {
		result[i] = TransactionToDTO(txs[i])
	}
	return result
}

func BalancedPostingToDTO(b accounting.BalancedPosting) dto.BalancedPostingResponse {
	return dto.BalancedPostingResponse{
		From: PostingToDTO(b.From),
		To:   PostingToDTO(b.To),
	}
}

func BalancedPostingsToDTO(bps []accounting.BalancedPosting) []dto.BalancedPostingResponse {
	if len(bps) == 0 {
		return []dto.BalancedPostingResponse{}
	}
	result := make([]dto.BalancedPostingResponse, len(bps))
	for i := range bps {
		result[i] = BalancedPostingToDTO(bps[i])
	}
	return result
}
