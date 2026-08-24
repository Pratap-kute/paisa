package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func NetworthTimelineItemToDTO(n service.Networth) dto.NetworthTimelineItemResponse {
	return dto.NetworthTimelineItemResponse{
		Date:                n.Date,
		InvestmentAmount:    n.InvestmentAmount,
		WithdrawalAmount:    n.WithdrawalAmount,
		GainAmount:          n.GainAmount,
		BalanceAmount:       n.BalanceAmount,
		BalanceUnits:        n.BalanceUnits,
		NetInvestmentAmount: n.NetInvestmentAmount,
	}
}

func NetworthTimelineToDTO(timeline []service.Networth) []dto.NetworthTimelineItemResponse {
	if len(timeline) == 0 {
		return []dto.NetworthTimelineItemResponse{}
	}
	result := make([]dto.NetworthTimelineItemResponse, len(timeline))
	for i := range timeline {
		result[i] = NetworthTimelineItemToDTO(timeline[i])
	}
	return result
}

func NetworthResultToDTO(r service.NetworthResult) dto.NetworthResponse {
	return dto.NetworthResponse{
		NetworthTimeline: NetworthTimelineToDTO(r.Timeline),
		XIRR:             r.XIRR,
	}
}

func CurrentNetworthResultToDTO(r service.CurrentNetworthResult) dto.CurrentNetworthResponse {
	return dto.CurrentNetworthResponse{
		Networth: NetworthTimelineItemToDTO(r.Networth),
		XIRR:     r.XIRR,
	}
}
