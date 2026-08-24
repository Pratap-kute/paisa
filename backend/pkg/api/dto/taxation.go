package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type TaxResponse struct {
	Gain      decimal.Decimal `json:"gain"`
	Taxable   decimal.Decimal `json:"taxable"`
	Slab      decimal.Decimal `json:"slab"`
	LongTerm  decimal.Decimal `json:"long_term"`
	ShortTerm decimal.Decimal `json:"short_term"`
}

type HarvestBreakdownResponse struct {
	Units             decimal.Decimal `json:"units"`
	PurchaseDate      time.Time       `json:"purchase_date"`
	PurchasePrice     decimal.Decimal `json:"purchase_price"`
	CurrentPrice      decimal.Decimal `json:"current_price"`
	PurchaseUnitPrice decimal.Decimal `json:"purchase_unit_price"`
	Tax               TaxResponse     `json:"tax"`
}

type HarvestableResponse struct {
	Account               string                     `json:"account"`
	TaxCategory           string                     `json:"tax_category"`
	TotalUnits            decimal.Decimal            `json:"total_units"`
	HarvestableUnits      decimal.Decimal            `json:"harvestable_units"`
	UnrealizedGain        decimal.Decimal            `json:"unrealized_gain"`
	TaxableUnrealizedGain decimal.Decimal            `json:"taxable_unrealized_gain"`
	HarvestBreakdown      []HarvestBreakdownResponse `json:"harvest_breakdown"`
	CurrentUnitPrice      decimal.Decimal            `json:"current_unit_price"`
	CurrentUnitDate       time.Time                  `json:"current_unit_date"`
}

type HarvestResponse struct {
	Harvestables map[string]HarvestableResponse `json:"harvestables"`
}

type TaxPostingPairResponse struct {
	Purchase PostingResponse `json:"purchase"`
	Sell     PostingResponse `json:"sell"`
	Tax      TaxResponse     `json:"tax"`
}

type FYCapitalGainResponse struct {
	Units         decimal.Decimal          `json:"units"`
	PurchasePrice decimal.Decimal          `json:"purchase_price"`
	SellPrice     decimal.Decimal          `json:"sell_price"`
	Tax           TaxResponse              `json:"tax"`
	PostingPairs  []TaxPostingPairResponse `json:"posting_pairs"`
}

type CapitalGainResponse struct {
	Account     string                           `json:"account"`
	TaxCategory string                           `json:"tax_category"`
	FY          map[string]FYCapitalGainResponse `json:"fy"`
}

type CapitalGainsResponse struct {
	CapitalGains map[string]CapitalGainResponse `json:"capital_gains"`
}

type ScheduleALSectionResponse struct {
	Code    string `json:"code"`
	Section string `json:"section"`
	Details string `json:"details"`
}

type ScheduleALEntryResponse struct {
	Section ScheduleALSectionResponse `json:"section"`
	Amount  decimal.Decimal           `json:"amount"`
}

type ScheduleALResponse struct {
	Entries []ScheduleALEntryResponse `json:"entries"`
	Date    time.Time                 `json:"date"`
}

type ScheduleALMapResponse struct {
	ScheduleALs map[string]ScheduleALResponse `json:"schedule_als"`
}
