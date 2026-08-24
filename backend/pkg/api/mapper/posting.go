package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
)

func PostingToDTO(p posting.Posting) dto.PostingResponse {
	return dto.PostingResponse{
		ID:                   p.ID,
		TransactionID:        p.TransactionID,
		Date:                 p.Date,
		Payee:                p.Payee,
		Account:              p.Account,
		Commodity:            p.Commodity,
		Quantity:             p.Quantity,
		Amount:               p.Amount,
		Status:               p.Status,
		TagRecurring:         p.TagRecurring,
		TagPeriod:            p.TagPeriod,
		TransactionBeginLine: p.TransactionBeginLine,
		TransactionEndLine:   p.TransactionEndLine,
		FileName:             p.FileName,
		Forecast:             p.Forecast,
		Note:                 p.Note,
		TransactionNote:      p.TransactionNote,
		MarketAmount:         p.MarketAmount,
		Balance:              p.Balance,
	}
}

func PostingsToDTO(postings []posting.Posting) []dto.PostingResponse {
	if len(postings) == 0 {
		return []dto.PostingResponse{}
	}
	result := make([]dto.PostingResponse, len(postings))
	for i := range postings {
		result[i] = PostingToDTO(postings[i])
	}
	return result
}
