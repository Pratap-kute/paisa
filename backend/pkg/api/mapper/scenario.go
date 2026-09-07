package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func ScenarioAssumptionToDTO(v service.ScenarioAssumption) dto.ScenarioAssumption {
	r := dto.ScenarioAssumption{}
	r.Value = v.Value
	r.Source = v.Source
	r.SampleCount = v.SampleCount
	return r
}
func ScenarioReasonToDTO(v service.ScenarioReason) dto.ScenarioReason {
	r := dto.ScenarioReason{}
	r.Code = v.Code
	r.Field = v.Field
	return r
}
func ScenarioQualityToDTO(v service.ScenarioQuality) dto.ScenarioQuality {
	r := dto.ScenarioQuality{}
	r.Status = v.Status
	r.Reasons = make([]dto.ScenarioReason, len(v.Reasons))
	for i, x := range v.Reasons {
		r.Reasons[i] = ScenarioReasonToDTO(x)
	}
	return r
}
func ScenarioBaselineToDTO(v service.ScenarioBaseline) dto.ScenarioBaseline {
	r := dto.ScenarioBaseline{}
	r.AsOfDate = v.AsOfDate
	r.StartDate = v.StartDate
	r.Currency = v.Currency
	r.HorizonMonths = v.HorizonMonths
	r.CurrentCash = v.CurrentCash
	r.CurrentInvestmentValue = v.CurrentInvestmentValue
	r.CurrentNetWorth = v.CurrentNetWorth
	r.StaticNetWorthComponent = v.StaticNetWorthComponent
	r.MonthlyIncome = ScenarioAssumptionToDTO(v.MonthlyIncome)
	r.MonthlyExpenses = ScenarioAssumptionToDTO(v.MonthlyExpenses)
	r.MonthlyInvestmentTransfer = ScenarioAssumptionToDTO(v.MonthlyInvestmentTransfer)
	r.Quality = ScenarioQualityToDTO(v.Quality)
	return r
}
func ScenarioEventToDTO(v service.ScenarioEvent) dto.ScenarioEvent {
	r := dto.ScenarioEvent{}
	r.Month = v.Month
	r.Type = v.Type
	r.Amount = v.Amount
	r.Label = v.Label
	return r
}
func ScenarioEventFromDTO(v dto.ScenarioEvent) service.ScenarioEvent {
	r := service.ScenarioEvent{}
	r.Month = v.Month
	r.Type = v.Type
	r.Amount = v.Amount
	r.Label = v.Label
	return r
}
func ScenarioRequestToDTO(v service.ScenarioRequest) dto.ScenarioRequest {
	r := dto.ScenarioRequest{}
	r.HorizonMonths = v.HorizonMonths
	r.MonthlyIncome = v.MonthlyIncome
	r.MonthlyExpenses = v.MonthlyExpenses
	r.MonthlyInvestmentTransfer = v.MonthlyInvestmentTransfer
	r.AnnualInvestmentReturn = v.AnnualInvestmentReturn
	r.ScenarioAnnualInvestmentReturn = v.ScenarioAnnualInvestmentReturn
	r.OneTimeEvents = make([]dto.ScenarioEvent, len(v.OneTimeEvents))
	for i, x := range v.OneTimeEvents {
		r.OneTimeEvents[i] = ScenarioEventToDTO(x)
	}
	return r
}
func ScenarioRequestFromDTO(v dto.ScenarioRequest) service.ScenarioRequest {
	r := service.ScenarioRequest{}
	r.HorizonMonths = v.HorizonMonths
	r.MonthlyIncome = v.MonthlyIncome
	r.MonthlyExpenses = v.MonthlyExpenses
	r.MonthlyInvestmentTransfer = v.MonthlyInvestmentTransfer
	r.AnnualInvestmentReturn = v.AnnualInvestmentReturn
	r.ScenarioAnnualInvestmentReturn = v.ScenarioAnnualInvestmentReturn
	r.OneTimeEvents = make([]service.ScenarioEvent, len(v.OneTimeEvents))
	for i, x := range v.OneTimeEvents {
		r.OneTimeEvents[i] = ScenarioEventFromDTO(x)
	}
	return r
}
func ScenarioPointToDTO(v service.ScenarioPoint) dto.ScenarioPoint {
	r := dto.ScenarioPoint{}
	r.Month = v.Month
	r.Income = v.Income
	r.Expenses = v.Expenses
	r.InvestmentTransfer = v.InvestmentTransfer
	r.InvestmentGrowth = v.InvestmentGrowth
	r.Cash = v.Cash
	r.Investment = v.Investment
	r.NetWorth = v.NetWorth
	return r
}
func ScenarioProjectionToDTO(v service.ScenarioProjection) dto.ScenarioProjection {
	r := dto.ScenarioProjection{}
	r.StartDate = v.StartDate
	r.EndDate = v.EndDate
	r.OpeningCash = v.OpeningCash
	r.OpeningInvestment = v.OpeningInvestment
	r.OpeningNetWorth = v.OpeningNetWorth
	r.EndingCash = v.EndingCash
	r.EndingInvestment = v.EndingInvestment
	r.EndingNetWorth = v.EndingNetWorth
	r.MinimumCashBalance = v.MinimumCashBalance
	r.TotalIncome = v.TotalIncome
	r.TotalExpenses = v.TotalExpenses
	r.TotalInvestmentTransfers = v.TotalInvestmentTransfers
	r.TotalInvestmentGrowth = v.TotalInvestmentGrowth
	r.OpeningCashNegative = v.OpeningCashNegative
	r.FirstNegativeCashMonth = v.FirstNegativeCashMonth
	r.Points = make([]dto.ScenarioPoint, len(v.Points))
	for i := range v.Points {
		r.Points[i] = ScenarioPointToDTO(v.Points[i])
	}
	return r
}
func ScenarioImpactToDTO(v service.ScenarioImpact) dto.ScenarioImpact {
	r := dto.ScenarioImpact{}
	r.EndingCashDelta = v.EndingCashDelta
	r.EndingInvestmentDelta = v.EndingInvestmentDelta
	r.EndingNetWorthDelta = v.EndingNetWorthDelta
	r.InvestmentGrowthDelta = v.InvestmentGrowthDelta
	r.MinimumCashDelta = v.MinimumCashDelta
	return r
}
func ScenarioAssumptionsToDTO(v service.ScenarioAssumptions) dto.ScenarioAssumptions {
	r := dto.ScenarioAssumptions{}
	r.AnnualInvestmentReturn = v.AnnualInvestmentReturn
	r.ScenarioAnnualInvestmentReturn = v.ScenarioAnnualInvestmentReturn
	r.HorizonMonths = v.HorizonMonths
	return r
}
func ScenarioResultToDTO(v service.ScenarioResult) dto.ScenarioResult {
	r := dto.ScenarioResult{}
	r.Available = v.Available
	r.Snapshot = ScenarioBaselineToDTO(v.Snapshot)
	if v.Baseline != nil {
		x := ScenarioProjectionToDTO(*v.Baseline)
		r.Baseline = &x
	}
	if v.Scenario != nil {
		x := ScenarioProjectionToDTO(*v.Scenario)
		r.Scenario = &x
	}
	if v.Impact != nil {
		x := ScenarioImpactToDTO(*v.Impact)
		r.Impact = &x
	}
	r.Assumptions = ScenarioAssumptionsToDTO(v.Assumptions)
	r.Quality = ScenarioQualityToDTO(v.Quality)
	return r
}
