package goal

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type GoalSummary = dto.GoalSummaryResponse

func GetGoalSummaries(db *gorm.DB) []GoalSummary {
	goals := config.GetConfig().Goals
	summaries := make([]GoalSummary, 0, len(goals.Retirement)+len(goals.Savings))
	assetPostings := query.Init(db).Like("Assets:%").All()
	assetPostings = service.PopulateMarketPrice(db, assetPostings)

	for _, goal := range goals.Retirement {
		summaries = append(summaries, getRetirementSummary(db, assetPostings, goal))
	}

	for _, goal := range config.GetConfig().Goals.Savings {
		summaries = append(summaries, getSavingsSummary(assetPostings, goal))
	}

	return summaries
}

func GetGoalDetails(db *gorm.DB, goalType string, name string) gin.H {
	switch goalType {
	case "retirement":
		conf, _ := lo.Find(config.GetConfig().Goals.Retirement, func(conf config.RetirementGoal) bool { return conf.Name == name })
		return getRetirementDetail(db, conf)
	case "savings":
		conf, _ := lo.Find(config.GetConfig().Goals.Savings, func(conf config.SavingsGoal) bool { return conf.Name == name })
		return getSavingsDetail(db, conf)
	}
	return gin.H{}
}
