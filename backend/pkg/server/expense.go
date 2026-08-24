package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetCurrentExpense(db *gorm.DB) map[string][]dto.PostingResponse {
	expenses := service.GetCurrentExpense(db)
	return mapper.GroupedPostingsMapToDTO(expenses)
}

func GetExpense(db *gorm.DB) dto.ExpenseResponse {
	res := service.GetExpense(db)
	return mapper.ExpenseResultToDTO(res)
}
