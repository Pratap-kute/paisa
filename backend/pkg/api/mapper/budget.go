package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func AccountBudgetToDTO(a service.AccountBudget) dto.AccountBudgetResponse {
	return dto.AccountBudgetResponse{
		Account:   a.Account,
		Forecast:  a.Forecast,
		Actual:    a.Actual,
		Rollover:  a.Rollover,
		Available: a.Available,
		Date:      a.Date,
		Expenses:  PostingsToDTO(a.Expenses),
	}
}

func AccountBudgetsToDTO(accounts []service.AccountBudget) []dto.AccountBudgetResponse {
	if len(accounts) == 0 {
		return []dto.AccountBudgetResponse{}
	}
	result := make([]dto.AccountBudgetResponse, len(accounts))
	for i := range accounts {
		result[i] = AccountBudgetToDTO(accounts[i])
	}
	return result
}

func BudgetToDTO(b service.Budget) dto.BudgetResponse {
	return dto.BudgetResponse{
		Date:               b.Date,
		Accounts:           AccountBudgetsToDTO(b.Accounts),
		AvailableThisMonth: b.AvailableThisMonth,
		EndOfMonthBalance:  b.EndOfMonthBalance,
		Forecast:           b.Forecast,
	}
}

func BudgetsMapToDTO(budgets map[string]service.Budget) map[string]dto.BudgetResponse {
	result := make(map[string]dto.BudgetResponse, len(budgets))
	for k, v := range budgets {
		result[k] = BudgetToDTO(v)
	}
	return result
}

func BudgetResultToDTO(r service.BudgetResult) dto.BudgetsSummaryResponse {
	return dto.BudgetsSummaryResponse{
		BudgetsByMonth:        BudgetsMapToDTO(r.BudgetsByMonth),
		CheckingBalance:       r.CheckingBalance,
		AvailableForBudgeting: r.AvailableForBudgeting,
	}
}
