package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func CashFlowToDTO(c service.CashFlow) dto.CashFlowResponse {
	return dto.CashFlowResponse{
		Date:        c.Date,
		Income:      c.Income,
		Expenses:    c.Expenses,
		Liabilities: c.Liabilities,
		Investment:  c.Investment,
		Tax:         c.Tax,
		Checking:    c.Checking,
		Balance:     c.Balance,
	}
}

func CashFlowsToDTO(flows []service.CashFlow) []dto.CashFlowResponse {
	if len(flows) == 0 {
		return []dto.CashFlowResponse{}
	}
	result := make([]dto.CashFlowResponse, len(flows))
	for i := range flows {
		result[i] = CashFlowToDTO(flows[i])
	}
	return result
}
