package server

import (
	"errors"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/server/goal"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func investmentPerformanceDashboardSummary(
	performance service.InvestmentPerformance,
	err error,
) (*dto.InvestmentPerformance, *string) {
	if err == nil {
		mapped := mapper.InvestmentPerformanceToDTO(performance)
		return &mapped, nil
	}
	code := "investment_performance_failed"
	if errors.Is(err, service.ErrPerformanceReconciliation) {
		code = "investment_performance_reconciliation_failed"
	}
	return nil, &code
}

func GetDashboard(db *gorm.DB) gin.H {
	performance, performanceErr := service.GetInvestmentPerformance(db, service.PerformanceOptions{Preset: "current_fy"})
	performanceSummary, performanceError := investmentPerformanceDashboardSummary(performance, performanceErr)
	return gin.H{
		"investmentPerformance":      performanceSummary,
		"investmentPerformanceError": performanceError,
		"checkingBalances":           assets.GetCheckingBalance(db),
		"networth":                   GetCurrentNetworth(db),
		"expenses":                   GetCurrentExpense(db),
		"cashFlows":                  GetCurrentCashFlow(db),
		"transactionSequences":       mapper.TransactionSequencesToDTO(service.ComputeRecurringTransactions(query.Init(db).All())),
		"transactions":               GetLatestTransactions(db),
		"budget":                     GetCurrentBudget(db),
		"goalSummaries":              goal.GetGoalSummaries(db),
	}
}
