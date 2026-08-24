package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetIncome(db *gorm.DB) dto.IncomeResponse {
	res := service.GetIncome(db)
	return mapper.IncomeResultToDTO(res)
}
