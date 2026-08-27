package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func TransactionSequenceToDTO(s service.TransactionSequence) dto.TransactionSequenceResponse {
	return dto.TransactionSequenceResponse{
		Transactions: TransactionsToDTO(s.Transactions),
		Key:          s.Key,
		Period:       s.Period,
		Interval:     s.Interval,
	}
}

func TransactionSequencesToDTO(sequences []service.TransactionSequence) []dto.TransactionSequenceResponse {
	if len(sequences) == 0 {
		return []dto.TransactionSequenceResponse{}
	}
	result := make([]dto.TransactionSequenceResponse, len(sequences))
	for i := range sequences {
		result[i] = TransactionSequenceToDTO(sequences[i])
	}
	return result
}
