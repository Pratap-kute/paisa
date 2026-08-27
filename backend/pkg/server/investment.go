package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetInvestment(db *gorm.DB) dto.InvestmentResponse {
	res := service.GetInvestment(db)
	return mapper.InvestmentResultToDTO(res)
}
