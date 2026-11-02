package server

import (
	"errors"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"

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

// expensePaceSummary projects this month's spending against the month's budget.
func expensePaceSummary(db *gorm.DB, expenses map[string][]posting.Posting) *dto.ExpensePaceResponse {
	asOf := utils.Now().In(config.TimeZone())
	spent := utils.SumBy(expenses[asOf.Format("2006-01")], func(p posting.Posting) decimal.Decimal { return p.Amount })

	var planned *decimal.Decimal
	if budget, ok := service.GetCurrentBudget(db).BudgetsByMonth[asOf.Format("2006-01")]; ok && len(budget.Accounts) > 0 {
		total := utils.SumBy(budget.Accounts, func(a service.AccountBudget) decimal.Decimal { return a.Forecast })
		planned = &total
	}

	pace := service.ProjectExpensePace(spent, planned, asOf)
	if pace == nil {
		return nil
	}
	return &dto.ExpensePaceResponse{Period: pace.Period, ProjectedExpenses: pace.ProjectedExpenses, OverBudget: pace.OverBudget}
}

func GetDashboard(db *gorm.DB) gin.H {
	currentExpenses := service.GetCurrentExpense(db)
	performance, performanceErr := service.GetInvestmentPerformance(db, service.PerformanceOptions{Preset: "current_fy"})
	performanceSummary, performanceError := investmentPerformanceDashboardSummary(performance, performanceErr)
	return gin.H{
		"investmentPerformance":      performanceSummary,
		"investmentPerformanceError": performanceError,
		"checkingBalances":           assets.GetCheckingBalance(db),
		"networth":                   GetCurrentNetworth(db),
		"expenses":                   mapper.GroupedPostingsMapToDTO(currentExpenses),
		"expensePace":                expensePaceSummary(db, currentExpenses),
		"cashFlows":                  GetCurrentCashFlow(db),
		"transactionSequences":       mapper.TransactionSequencesToDTO(service.ComputeRecurringTransactions(query.Init(db).All())),
		"transactions":               GetLatestTransactions(db),
		"budget":                     GetCurrentBudget(db),
		"goalSummaries":              goal.GetGoalSummaries(db),
	}
}
