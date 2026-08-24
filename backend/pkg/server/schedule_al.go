package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/taxation"
	"gorm.io/gorm"
)

func GetScheduleAL(db *gorm.DB) dto.ScheduleALMapResponse {
	sals := taxation.GetScheduleAL(db)
	return dto.ScheduleALMapResponse{ScheduleALs: mapper.ScheduleALsMapToDTO(sals)}
}
