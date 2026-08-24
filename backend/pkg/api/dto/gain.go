package dto

import (
	"github.com/shopspring/decimal"
)

type GainResponse struct {
	Account  string                       `json:"account"`
	Networth NetworthTimelineItemResponse `json:"networth"`
	XIRR     decimal.Decimal              `json:"xirr"`
	Postings []PostingResponse            `json:"postings"`
}

type GainsResponse struct {
	GainBreakdown []GainResponse `json:"gain_breakdown"`
}

type AccountGainDetailResponse struct {
	Account          string                         `json:"account"`
	NetworthTimeline []NetworthTimelineItemResponse `json:"networthTimeline"`
	XIRR             decimal.Decimal                `json:"xirr"`
	Postings         []PostingResponse              `json:"postings"`
}

type AccountGainResponse struct {
	GainTimelineBreakdown *AccountGainDetailResponse         `json:"gain_timeline_breakdown,omitempty"`
	PortfolioAllocation   *PortfolioAllocationGroupsResponse `json:"portfolio_allocation,omitempty"`
	AssetBreakdown        *AssetBreakdownResponse            `json:"asset_breakdown,omitempty"`
}
