package server

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetLedger(db *gorm.DB) gin.H {
	postings := query.Init(db).Desc().All()
	postings = service.PopulateMarketPrice(db, postings)
	postings = accounting.PopulateBalance(postings)
	accounting.SortDesc(postings)
	return gin.H{"postings": postings}
}
