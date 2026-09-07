package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/server/goal"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetDashboard(db *gorm.DB) gin.H {
	performance, performanceErr := service.GetInvestmentPerformance(db, service.PerformanceOptions{Preset: "current_fy"})
	var performanceSummary *dto.InvestmentPerformance
	if performanceErr == nil {
		mapped := mapper.InvestmentPerformanceToDTO(performance)
		performanceSummary = &mapped
	}
	return gin.H{
		"investmentPerformance": performanceSummary,
		"checkingBalances":      assets.GetCheckingBalance(db),
		"networth":              GetCurrentNetworth(db),
		"expenses":              GetCurrentExpense(db),
		"cashFlows":             GetCurrentCashFlow(db),
		"transactionSequences":  mapper.TransactionSequencesToDTO(service.ComputeRecurringTransactions(query.Init(db).All())),
		"transactions":          GetLatestTransactions(db),
		"budget":                GetCurrentBudget(db),
		"goalSummaries":         goal.GetGoalSummaries(db),
	}
}
