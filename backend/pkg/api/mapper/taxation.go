package mapper

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/taxation"
)

func TaxToDTO(t taxation.Tax) dto.TaxResponse {
	return dto.TaxResponse{
		Gain:      t.Gain,
		Taxable:   t.Taxable,
		Slab:      t.Slab,
		LongTerm:  t.LongTerm,
		ShortTerm: t.ShortTerm,
	}
}

func HarvestBreakdownToDTO(b taxation.HarvestBreakdown) dto.HarvestBreakdownResponse {
	return dto.HarvestBreakdownResponse{
		Units:             b.Units,
		PurchaseDate:      b.PurchaseDate,
		PurchasePrice:     b.PurchasePrice,
		CurrentPrice:      b.CurrentPrice,
		PurchaseUnitPrice: b.PurchaseUnitPrice,
		Tax:               TaxToDTO(b.Tax),
	}
}

func HarvestBreakdownsToDTO(breakdowns []taxation.HarvestBreakdown) []dto.HarvestBreakdownResponse {
	if len(breakdowns) == 0 {
		return []dto.HarvestBreakdownResponse{}
	}
	result := make([]dto.HarvestBreakdownResponse, len(breakdowns))
	for i := range breakdowns {
		result[i] = HarvestBreakdownToDTO(breakdowns[i])
	}
	return result
}

func HarvestableToDTO(h taxation.Harvestable) dto.HarvestableResponse {
	return dto.HarvestableResponse{
		Account:               h.Account,
		TaxCategory:           h.TaxCategory,
		TotalUnits:            h.TotalUnits,
		HarvestableUnits:      h.HarvestableUnits,
		UnrealizedGain:        h.UnrealizedGain,
		TaxableUnrealizedGain: h.TaxableUnrealizedGain,
		HarvestBreakdown:      HarvestBreakdownsToDTO(h.HarvestBreakdown),
		CurrentUnitPrice:      h.CurrentUnitPrice,
		CurrentUnitDate:       h.CurrentUnitDate,
	}
}

func HarvestablesMapToDTO(m map[string]taxation.Harvestable) map[string]dto.HarvestableResponse {
	result := make(map[string]dto.HarvestableResponse, len(m))
	for k, v := range m {
		result[k] = HarvestableToDTO(v)
	}
	return result
}

func TaxPostingPairToDTO(p taxation.TaxPostingPair) dto.TaxPostingPairResponse {
	return dto.TaxPostingPairResponse{
		Purchase: PostingToDTO(p.Purchase),
		Sell:     PostingToDTO(p.Sell),
		Tax:      TaxToDTO(p.Tax),
	}
}

func TaxPostingPairsToDTO(pairs []taxation.TaxPostingPair) []dto.TaxPostingPairResponse {
	if len(pairs) == 0 {
		return []dto.TaxPostingPairResponse{}
	}
	result := make([]dto.TaxPostingPairResponse, len(pairs))
	for i := range pairs {
		result[i] = TaxPostingPairToDTO(pairs[i])
	}
	return result
}

func FYCapitalGainToDTO(f taxation.FYCapitalGain) dto.FYCapitalGainResponse {
	return dto.FYCapitalGainResponse{
		Units:         f.Units,
		PurchasePrice: f.PurchasePrice,
		SellPrice:     f.SellPrice,
		Tax:           TaxToDTO(f.Tax),
		PostingPairs:  TaxPostingPairsToDTO(f.PostingPairs),
	}
}

func FYCapitalGainsMapToDTO(m map[string]taxation.FYCapitalGain) map[string]dto.FYCapitalGainResponse {
	result := make(map[string]dto.FYCapitalGainResponse, len(m))
	for k, v := range m {
		result[k] = FYCapitalGainToDTO(v)
	}
	return result
}

func CapitalGainToDTO(c taxation.CapitalGain) dto.CapitalGainResponse {
	return dto.CapitalGainResponse{
		Account:     c.Account,
		TaxCategory: c.TaxCategory,
		FY:          FYCapitalGainsMapToDTO(c.FY),
	}
}

func CapitalGainsMapToDTO(m map[string]taxation.CapitalGain) map[string]dto.CapitalGainResponse {
	result := make(map[string]dto.CapitalGainResponse, len(m))
	for k, v := range m {
		result[k] = CapitalGainToDTO(v)
	}
	return result
}

func ScheduleALSectionToDTO(s taxation.ScheduleALSection) dto.ScheduleALSectionResponse {
	return dto.ScheduleALSectionResponse{
		Code:    s.Code,
		Section: s.Section,
		Details: s.Details,
	}
}

func ScheduleALEntryToDTO(e taxation.ScheduleALEntry) dto.ScheduleALEntryResponse {
	return dto.ScheduleALEntryResponse{
		Section: ScheduleALSectionToDTO(e.Section),
		Amount:  e.Amount,
	}
}

func ScheduleALEntriesToDTO(entries []taxation.ScheduleALEntry) []dto.ScheduleALEntryResponse {
	if len(entries) == 0 {
		return []dto.ScheduleALEntryResponse{}
	}
	result := make([]dto.ScheduleALEntryResponse, len(entries))
	for i := range entries {
		result[i] = ScheduleALEntryToDTO(entries[i])
	}
	return result
}

func ScheduleALToDTO(s taxation.ScheduleAL) dto.ScheduleALResponse {
	return dto.ScheduleALResponse{
		Entries: ScheduleALEntriesToDTO(s.Entries),
		Date:    s.Date,
	}
}

func ScheduleALsMapToDTO(m map[string]taxation.ScheduleAL) map[string]dto.ScheduleALResponse {
	result := make(map[string]dto.ScheduleALResponse, len(m))
	for k, v := range m {
		result[k] = ScheduleALToDTO(v)
	}
	return result
}
