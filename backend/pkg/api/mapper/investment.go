package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func InvestmentYearlyCardToDTO(c service.InvestmentYearlyCard) dto.InvestmentYearlyCardResponse {
	return dto.InvestmentYearlyCardResponse{
		StartDate:         c.StartDate,
		EndDate:           c.EndDate,
		Postings:          PostingsToDTO(c.Postings),
		GrossSalaryIncome: c.GrossSalaryIncome,
		GrossOtherIncome:  c.GrossOtherIncome,
		NetTax:            c.NetTax,
		NetIncome:         c.NetIncome,
		NetInvestment:     c.NetInvestment,
		NetExpense:        c.NetExpense,
		SavingsRate:       c.SavingsRate,
	}
}

func InvestmentYearlyCardsToDTO(cards []service.InvestmentYearlyCard) []dto.InvestmentYearlyCardResponse {
	if len(cards) == 0 {
		return []dto.InvestmentYearlyCardResponse{}
	}
	result := make([]dto.InvestmentYearlyCardResponse, len(cards))
	for i := range cards {
		result[i] = InvestmentYearlyCardToDTO(cards[i])
	}
	return result
}

func InvestmentResultToDTO(r service.InvestmentResult) dto.InvestmentResponse {
	return dto.InvestmentResponse{
		Assets:      PostingsToDTO(r.Assets),
		YearlyCards: InvestmentYearlyCardsToDTO(r.YearlyCards),
	}
}
