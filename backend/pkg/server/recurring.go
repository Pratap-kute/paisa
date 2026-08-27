package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetRecurringTransactions(db *gorm.DB) dto.RecurringTransactionsResponse {
	seqs := service.GetRecurringTransactions(db)
	return dto.RecurringTransactionsResponse{
		TransactionSequences: mapper.TransactionSequencesToDTO(seqs),
	}
}
