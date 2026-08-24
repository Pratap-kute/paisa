package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type AggregateResponse struct {
	Date         time.Time       `json:"date"`
	Account      string          `json:"account"`
	MarketAmount decimal.Decimal `json:"market_amount"`
}

type AllocationTargetResponse struct {
	Name       string                       `json:"name"`
	Target     decimal.Decimal              `json:"target"`
	Current    decimal.Decimal              `json:"current"`
	Aggregates map[string]AggregateResponse `json:"aggregates"`
}

type AllocationResponse struct {
	Aggregates         map[string]AggregateResponse   `json:"aggregates"`
	AggregatesTimeline []map[string]AggregateResponse `json:"aggregates_timeline"`
	AllocationTargets  []AllocationTargetResponse     `json:"allocation_targets"`
}

type CommodityBreakdownResponse struct {
	ParentCommodityID string          `json:"parent_commodity_id"`
	CommodityName     string          `json:"commodity_name"`
	SecurityName      string          `json:"security_name"`
	SecurityRating    string          `json:"security_rating"`
	SecurityIndustry  string          `json:"security_industry"`
	Percentage        decimal.Decimal `json:"percentage"`
	SecurityID        string          `json:"security_id"`
	SecurityType      string          `json:"security_type"`
	Amount            decimal.Decimal `json:"amount"`
}

type PortfolioAggregateResponse struct {
	Group      string                       `json:"group"`
	SubGroup   string                       `json:"sub_group"`
	ID         string                       `json:"id"`
	Percentage decimal.Decimal              `json:"percentage"`
	Amount     decimal.Decimal              `json:"amount"`
	Breakdowns []CommodityBreakdownResponse `json:"breakdowns"`
}

type PortfolioAllocationGroupsResponse struct {
	Commodities         []string                     `json:"commodities"`
	NameAndSecurityType []PortfolioAggregateResponse `json:"name_and_security_type"`
	SecurityType        []PortfolioAggregateResponse `json:"security_type"`
	Rating              []PortfolioAggregateResponse `json:"rating"`
	Industry            []PortfolioAggregateResponse `json:"industry"`
}

type PortfolioAllocationResponse struct {
	PortfolioAllocation PortfolioAllocationGroupsResponse `json:"portfolio_allocation"`
}
