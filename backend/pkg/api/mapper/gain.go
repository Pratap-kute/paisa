package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func GainToDTO(g service.Gain) dto.GainResponse {
	return dto.GainResponse{
		Account:  g.Account,
		Networth: NetworthTimelineItemToDTO(g.Networth),
		XIRR:     g.XIRR,
		Postings: PostingsToDTO(g.Postings),
	}
}

func GainsToDTO(gains []service.Gain) []dto.GainResponse {
	if len(gains) == 0 {
		return []dto.GainResponse{}
	}
	result := make([]dto.GainResponse, len(gains))
	for i := range gains {
		result[i] = GainToDTO(gains[i])
	}
	return result
}

func AccountGainToDTO(g service.AccountGain) dto.AccountGainResponse {
	return dto.AccountGainResponse{
		Account:          g.Account,
		NetworthTimeline: NetworthTimelineToDTO(g.NetworthTimeline),
		XIRR:             g.XIRR,
		Postings:         PostingsToDTO(g.Postings),
	}
}
