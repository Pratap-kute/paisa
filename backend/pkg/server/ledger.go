package server

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetLedger(db *gorm.DB) dto.PostingsResponse {
	postings := query.Init(db).Desc().All()
	postings = service.PopulateMarketPrice(db, postings)
	postings = accounting.PopulateBalance(postings)
	accounting.SortDesc(postings)
	return dto.PostingsResponse{Postings: mapper.PostingsToDTO(postings)}
}
