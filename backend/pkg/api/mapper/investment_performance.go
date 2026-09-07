package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func PerformanceReasonToDTO(s service.PerformanceReason) dto.PerformanceReason {
	r := dto.PerformanceReason{}
	r.Code = s.Code
	r.Account = s.Account
	r.Commodity = s.Commodity
	r.Date = s.Date
	return r
}
func PerformanceQualityToDTO(s service.PerformanceQuality) dto.PerformanceQuality {
	r := dto.PerformanceQuality{}
	r.Status = s.Status
	r.Reasons = make([]dto.PerformanceReason, len(s.Reasons))
	for i, v := range s.Reasons {
		r.Reasons[i] = PerformanceReasonToDTO(v)
	}
	return r
}
func PerformanceQuoteToDTO(s service.PerformanceQuote) dto.PerformanceQuote {
	r := dto.PerformanceQuote{}
	r.Commodity = s.Commodity
	r.Date = s.Date
	r.Source = s.Source
	return r
}
func PerformancePointToDTO(s service.PerformancePoint) dto.PerformancePoint {
	r := dto.PerformancePoint{}
	r.Date = s.Date
	r.Value = s.Value
	r.ContributionBaseline = s.ContributionBaseline
	r.Quality = PerformanceQualityToDTO(s.Quality)
	r.Quotes = make([]dto.PerformanceQuote, len(s.Quotes))
	for i, v := range s.Quotes {
		r.Quotes[i] = PerformanceQuoteToDTO(v)
	}
	return r
}
func InvestmentPerformanceToDTO(s service.InvestmentPerformance) dto.InvestmentPerformance {
	r := dto.InvestmentPerformance{}
	r.StartDate = s.StartDate
	r.EndDate = s.EndDate
	r.Account = s.Account
	r.OpeningValue = s.OpeningValue
	r.ClosingValue = s.ClosingValue
	r.Contributions = s.Contributions
	r.Withdrawals = s.Withdrawals
	r.NetContribution = s.NetContribution
	r.PortfolioChange = s.PortfolioChange
	r.InvestmentReturn = s.InvestmentReturn
	r.PeriodReturn = s.PeriodReturn
	r.SinceInceptionXIRR = s.SinceInceptionXIRR
	r.ReturnUnavailableReason = s.ReturnUnavailableReason
	r.Quality = PerformanceQualityToDTO(s.Quality)
	r.OpeningQuotes = make([]dto.PerformanceQuote, len(s.OpeningQuotes))
	for i, v := range s.OpeningQuotes {
		r.OpeningQuotes[i] = PerformanceQuoteToDTO(v)
	}
	r.ClosingQuotes = make([]dto.PerformanceQuote, len(s.ClosingQuotes))
	for i, v := range s.ClosingQuotes {
		r.ClosingQuotes[i] = PerformanceQuoteToDTO(v)
	}
	r.Drivers = make([]dto.PerformanceDriver, len(s.Drivers))
	for i := range s.Drivers {
		r.Drivers[i] = PerformanceDriverToDTO(s.Drivers[i])
	}
	r.Timeline = make([]dto.PerformancePoint, len(s.Timeline))
	for i, v := range s.Timeline {
		r.Timeline[i] = PerformancePointToDTO(v)
	}
	return r
}
func PerformanceDriverToDTO(s service.PerformanceDriver) dto.PerformanceDriver {
	r := dto.PerformanceDriver{}
	r.Account = s.Account
	r.OpeningValue = s.OpeningValue
	r.ClosingValue = s.ClosingValue
	r.NetContribution = s.NetContribution
	r.ReturnAmount = s.ReturnAmount
	r.PeriodReturn = s.PeriodReturn
	r.ReturnUnavailableReason = s.ReturnUnavailableReason
	r.Quality = PerformanceQualityToDTO(s.Quality)
	return r
}
