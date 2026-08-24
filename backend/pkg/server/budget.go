package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetBudget(db *gorm.DB) dto.BudgetsSummaryResponse {
	res := service.GetBudget(db)
	return mapper.BudgetResultToDTO(res)
}

func GetCurrentBudget(db *gorm.DB) dto.BudgetsSummaryResponse {
	res := service.GetCurrentBudget(db)
	return mapper.BudgetResultToDTO(res)
}
