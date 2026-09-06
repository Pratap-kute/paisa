package goal

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
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
	// Reuse asset history: older activity is needed to retain observed zero
	// months. Only the additional capital-gain offsets need a new bounded query.
	contributionPostings := assetPostings
	if len(goals.Savings) > 0 {
		end := utils.BeginningOfMonth(utils.Now())
		gains := query.Init(db).Like("Income:CapitalGains:%").Between(end.AddDate(0, -6, 0), end).All()
		contributionPostings = append(contributionPostings, gains...)
	}

	for _, goal := range goals.Retirement {
		summaries = append(summaries, getRetirementSummary(db, assetPostings, goal))
	}

	for _, goal := range config.GetConfig().Goals.Savings {
		summary := getSavingsSummary(assetPostings, goal)
		summary.ContributionHistory = contributionHistory(db, contributionPostings, goal.Accounts)
		summaries = append(summaries, summary)
	}

	return summaries
}

func contributionHistory(db *gorm.DB, ps []posting.Posting, accounts []string) []dto.GoalContributionMonth {
	months := service.MonthlyContributions(db, ps, accounts, utils.Now())
	result := make([]dto.GoalContributionMonth, 0, len(months))
	for _, month := range months {
		result = append(result, dto.GoalContributionMonth{Month: month.Month, Amount: month.Amount})
	}
	return result
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
