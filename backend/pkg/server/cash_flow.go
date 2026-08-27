package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetCashFlow(db *gorm.DB) dto.CashFlowsResponse {
	flows := service.GetCashFlow(db)
	return dto.CashFlowsResponse{CashFlows: mapper.CashFlowsToDTO(flows)}
}

func GetCurrentCashFlow(db *gorm.DB) []dto.CashFlowResponse {
	flows := service.GetCurrentCashFlow(db)
	return mapper.CashFlowsToDTO(flows)
}
