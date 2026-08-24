package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/taxation"
	"gorm.io/gorm"
)

func GetCapitalGains(db *gorm.DB) dto.CapitalGainsResponse {
	cg := taxation.GetCapitalGains(db)
	return dto.CapitalGainsResponse{CapitalGains: mapper.CapitalGainsMapToDTO(cg)}
}
