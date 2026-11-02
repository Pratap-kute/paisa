package goal

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
)

// analyze evaluates a goal as of today. The frontend only displays the result.
func analyze(goalType string, current, target decimal.Decimal, targetDate string, rate, payment float64, history []dto.GoalContributionMonth) dto.GoalIntelligenceResponse {
	currentValue, _ := current.Float64()
	targetValue, _ := target.Float64()
	contributions := make([]service.GoalContribution, 0, len(history))
	for _, month := range history {
		amount, _ := month.Amount.Float64()
		contributions = append(contributions, service.GoalContribution{Month: month.Month, Amount: amount})
	}
	result := service.AnalyzeGoal(service.GoalInput{
		Type:                goalType,
		Current:             currentValue,
		Target:              targetValue,
		TargetDate:          targetDate,
		Rate:                rate,
		PaymentPerPeriod:    payment,
		ContributionHistory: contributions,
	}, utils.Now().In(config.TimeZone()))

	return dto.GoalIntelligenceResponse{
		ProgressRatio:               result.ProgressRatio,
		RemainingAmount:             result.RemainingAmount,
		ValidTarget:                 result.ValidTarget,
		RequiredMonthlyContribution: result.RequiredMonthlyContribution,
		ActualMonthlyContribution:   result.ActualMonthlyContribution,
		ContributionMonthsObserved:  result.ContributionMonthsObserved,
		ActiveContributionMonths:    result.ActiveContributionMonths,
		PaceCoverage:                result.PaceCoverage,
		PaceGap:                     result.PaceGap,
		ProjectedCompletionDate:     result.ProjectedCompletionDate,
		ConfiguredCompletionDate:    result.ConfiguredCompletionDate,
		ProjectionSource:            result.ProjectionSource,
		DelayMonths:                 result.DelayMonths,
		State:                       result.State,
		ScheduleStatus:              result.ScheduleStatus,
		Attention:                   result.Attention,
		DeadlineSource:              result.DeadlineSource,
		TargetDate:                  result.TargetDate,
		AnnualReturn:                result.AnnualReturn,
		Reasons:                     result.Reasons,
	}
}
