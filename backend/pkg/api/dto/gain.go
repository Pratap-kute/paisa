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

type AccountGainResponse struct {
	Account          string                         `json:"account"`
	NetworthTimeline []NetworthTimelineItemResponse `json:"networthTimeline"`
	XIRR             decimal.Decimal                `json:"xirr"`
	Postings         []PostingResponse              `json:"postings"`
	PortfolioGroups  interface{}                    `json:"portfolioGroups,omitempty"`
}
