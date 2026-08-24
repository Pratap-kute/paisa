package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/taxation"
	"gorm.io/gorm"
)

func GetHarvest(db *gorm.DB) dto.HarvestResponse {
	harvestables := taxation.GetHarvest(db)
	return dto.HarvestResponse{Harvestables: mapper.HarvestablesMapToDTO(harvestables)}
}
