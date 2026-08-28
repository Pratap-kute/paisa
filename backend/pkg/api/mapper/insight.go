package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func InsightToDTO(i service.Insight) dto.InsightResponse {
	return dto.InsightResponse{
		ID:                     i.ID,
		Type:                   string(i.Type),
		Category:               string(i.Category),
		Severity:               string(i.Severity),
		Score:                  i.Score,
		Value:                  i.Value,
		PreviousValue:          i.PreviousValue,
		Change:                 i.Change,
		ChangePercent:          i.ChangePercent,
		BaselineQuality:        string(i.BaselineQuality),
		BaselineMethod:         string(i.BaselineMethod),
		BaselineValue:          i.BaselineValue,
		BaselineSampleCount:    i.BaselineSampleCount,
		InvestmentContribution: i.InvestmentContribution,
		GainContribution:       i.GainContribution,
		Period:                 i.Period,
		ComparisonPeriod:       i.ComparisonPeriod,
		Account:                i.Account,
		RelatedAccounts:        i.RelatedAccounts,
		Href:                   i.Href,
	}
}

func InsightsToDTO(res service.InsightsResult) dto.InsightsResponse {
	insights := make([]dto.InsightResponse, 0, len(res.Insights))
	for i := range res.Insights {
		insights = append(insights, InsightToDTO(res.Insights[i]))
	}
	return dto.InsightsResponse{
		Period:           res.Period,
		ComparisonPeriod: res.ComparisonPeriod,
		AsOf:             res.AsOf,
		IsPartial:        res.IsPartial,
		Insights:         insights,
	}
}
