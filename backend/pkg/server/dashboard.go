package server

import (
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/server/assets"
	"github.com/ananthakumaran/paisa/pkg/server/goal"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetDashboard(db *gorm.DB) gin.H {
	return gin.H{
		"checkingBalances":     assets.GetCheckingBalance(db),
		"networth":             GetCurrentNetworth(db),
		"expenses":             GetCurrentExpense(db),
		"cashFlows":            GetCurrentCashFlow(db),
		"transactionSequences": ComputeRecurringTransactions(query.Init(db).All()),
		"transactions":         GetLatestTransactions(db),
		"budget":               GetCurrentBudget(db),
		"goalSummaries":        goal.GetGoalSummaries(db),
	}
}
