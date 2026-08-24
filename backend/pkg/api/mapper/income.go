package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
)

func IncomeYearlyCardToDTO(c service.IncomeYearlyCard) dto.IncomeYearlyCardResponse {
	return dto.IncomeYearlyCardResponse{
		StartDate:   c.StartDate,
		EndDate:     c.EndDate,
		Postings:    PostingsToDTO(c.Postings),
		GrossIncome: c.GrossIncome,
		NetTax:      c.NetTax,
		NetIncome:   c.NetIncome,
	}
}

func IncomeYearlyCardsToDTO(cards []service.IncomeYearlyCard) []dto.IncomeYearlyCardResponse {
	if len(cards) == 0 {
		return []dto.IncomeYearlyCardResponse{}
	}
	result := make([]dto.IncomeYearlyCardResponse, len(cards))
	for i := range cards {
		result[i] = IncomeYearlyCardToDTO(cards[i])
	}
	return result
}

func IncomeTimelineItemToDTO(i service.Income) dto.IncomeTimelineItemResponse {
	return dto.IncomeTimelineItemResponse{
		Date:     i.Date,
		Postings: PostingsToDTO(i.Postings),
	}
}

func IncomeTimelineToDTO(timeline []service.Income) []dto.IncomeTimelineItemResponse {
	if len(timeline) == 0 {
		return []dto.IncomeTimelineItemResponse{}
	}
	result := make([]dto.IncomeTimelineItemResponse, len(timeline))
	for i := range timeline {
		result[i] = IncomeTimelineItemToDTO(timeline[i])
	}
	return result
}

func TaxTimelineItemToDTO(t service.Tax) dto.TaxTimelineItemResponse {
	return dto.TaxTimelineItemResponse{
		StartDate: t.StartDate,
		EndDate:   t.EndDate,
		Postings:  PostingsToDTO(t.Postings),
	}
}

func TaxTimelineToDTO(timeline []service.Tax) []dto.TaxTimelineItemResponse {
	if len(timeline) == 0 {
		return []dto.TaxTimelineItemResponse{}
	}
	result := make([]dto.TaxTimelineItemResponse, len(timeline))
	for i := range timeline {
		result[i] = TaxTimelineItemToDTO(timeline[i])
	}
	return result
}

func IncomeResultToDTO(r service.IncomeResult) dto.IncomeResponse {
	return dto.IncomeResponse{
		IncomeTimeline: IncomeTimelineToDTO(r.IncomeTimeline),
		TaxTimeline:    TaxTimelineToDTO(r.TaxTimeline),
		YearlyCards:    IncomeYearlyCardsToDTO(r.YearlyCards),
	}
}
