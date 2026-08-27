package liabilities

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

func GetRepayment(db *gorm.DB) dto.LiabilitiesRepaymentResponse {
	postings := query.Init(db).Like("Liabilities:%").Credit().All()
	postings = service.PopulateMarketPrice(db, postings)
	expenses := query.Init(db).Like("Expenses:Interest:%").All()
	postings = append(postings, expenses...)
	return dto.LiabilitiesRepaymentResponse{Repayments: mapper.PostingsToDTO(postings)}
}
