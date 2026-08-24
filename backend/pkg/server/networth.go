package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetNetworth(db *gorm.DB) dto.NetworthResponse {
	res := service.GetNetworth(db)
	return mapper.NetworthResultToDTO(res)
}

func GetCurrentNetworth(db *gorm.DB) dto.CurrentNetworthResponse {
	res := service.GetCurrentNetworth(db)
	return mapper.CurrentNetworthResultToDTO(res)
}
