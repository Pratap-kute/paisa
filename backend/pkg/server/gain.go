package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func GetGain(db *gorm.DB) dto.GainsResponse {
	gains := service.GetGain(db)
	return dto.GainsResponse{GainBreakdown: mapper.GainsToDTO(gains)}
}

func GetAccountGain(db *gorm.DB, account string) gin.H {
	gain, postings := service.GetAccountGainData(db, account)
	gainDTO := mapper.AccountGainToDTO(gain)

	commodities := lo.Uniq(lo.Map(postings, func(p posting.Posting, _ int) string { return p.Commodity }))
	portfolioGroups := GetAccountPortfolioAllocation(db, account)
	if len(commodities) == 0 || len(portfolioGroups.Commomdities) != len(commodities) {
		portfolioGroups = PortfolioAllocationGroups{Commomdities: []string{}, NameAndSecurityType: []PortfolioAggregate{}, SecurityType: []PortfolioAggregate{}, Rating: []PortfolioAggregate{}, Industry: []PortfolioAggregate{}}
	}

	assetBreakdown := assets.ComputeBreakdown(db, postings, false, account)

	return gin.H{
		"gain_timeline_breakdown": gainDTO,
		"portfolio_allocation":    portfolioGroups,
		"asset_breakdown":         assetBreakdown,
	}
}
