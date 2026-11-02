package server

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"gorm.io/gorm"
)

func GetLedger(db *gorm.DB) dto.PostingsResponse {
	postings := query.Init(db).Desc().All()
	postings = service.PopulateMarketPrice(db, postings)
	postings = accounting.PopulateBalance(postings)
	accounting.SortDesc(postings)
	response := mapper.PostingsToDTO(postings)

	today := utils.EndOfToday()
	for i := range postings {
		r, ok := service.ComputePostingReturn(postings[i], today)
		if !ok {
			continue
		}
		response[i].UnrealizedGain = &r.UnrealizedGain
		response[i].HoldingDays = &r.HoldingDays
		response[i].AnnualizedReturn = r.AnnualizedReturn
	}
	return dto.PostingsResponse{Postings: response}
}
