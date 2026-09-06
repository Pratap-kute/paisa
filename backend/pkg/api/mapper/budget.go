package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func AccountBudgetProjectionToDTO(p *service.AccountBudgetProjection) *dto.AccountBudgetProjectionResponse {
	if p == nil {
		return nil
	}
	return &dto.AccountBudgetProjectionResponse{
		Status:                string(p.Status),
		EffectiveBudget:       p.EffectiveBudget,
		ObservedSpend:         p.ObservedSpend,
		ProjectedSpend:        p.ProjectedSpend,
		ProjectedOverrun:      p.ProjectedOverrun,
		ProjectedRemaining:    p.ProjectedRemaining,
		ProjectedUsageRatio:   p.ProjectedUsageRatio,
		Source:                string(p.Source),
		HistoricalSampleCount: p.HistoricalSampleCount,
		ElapsedDays:           p.ElapsedDays,
		DaysInMonth:           p.DaysInMonth,
	}
}

func BudgetOutlookToDTO(o *service.BudgetOutlook) *dto.BudgetOutlookResponse {
	if o == nil {
		return nil
	}
	return &dto.BudgetOutlookResponse{
		OnTrackCount:      o.OnTrackCount,
		AtRiskCount:       o.AtRiskCount,
		LikelyOverCount:   o.LikelyOverCount,
		OverspentCount:    o.OverspentCount,
		InsufficientCount: o.InsufficientCount,
		TotalBudgets:      o.TotalBudgets,
		CoverageCount:     o.CoverageCount,
		ProjectedOverrun:  o.ProjectedOverrun,
	}
}

func AccountBudgetToDTO(a service.AccountBudget) dto.AccountBudgetResponse {
	return dto.AccountBudgetResponse{
		Account:    a.Account,
		Forecast:   a.Forecast,
		Actual:     a.Actual,
		Rollover:   a.Rollover,
		Available:  a.Available,
		Date:       a.Date,
		Expenses:   PostingsToDTO(a.Expenses),
		Projection: AccountBudgetProjectionToDTO(a.Projection),
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
		Outlook:            BudgetOutlookToDTO(b.Outlook),
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
