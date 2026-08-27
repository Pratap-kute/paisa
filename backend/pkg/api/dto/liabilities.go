package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type LiabilityOverviewResponse struct {
	Date           time.Time       `json:"date"`
	DrawnAmount    decimal.Decimal `json:"drawn_amount"`
	RepaidAmount   decimal.Decimal `json:"repaid_amount"`
	InterestAmount decimal.Decimal `json:"interest_amount"`
}

type LiabilityInterestResponse struct {
	Account          string                      `json:"account"`
	OverviewTimeline []LiabilityOverviewResponse `json:"overview_timeline"`
	APR              decimal.Decimal             `json:"apr"`
}

type LiabilitiesInterestResponse struct {
	InterestTimelineBreakdown []LiabilityInterestResponse `json:"interest_timeline_breakdown"`
}

type LiabilityBreakdownResponse struct {
	Group          string          `json:"group"`
	DrawnAmount    decimal.Decimal `json:"drawn_amount"`
	RepaidAmount   decimal.Decimal `json:"repaid_amount"`
	InterestAmount decimal.Decimal `json:"interest_amount"`
	BalanceAmount  decimal.Decimal `json:"balance_amount"`
	APR            decimal.Decimal `json:"apr"`
}

type LiabilitiesBalanceResponse struct {
	LiabilityBreakdowns map[string]LiabilityBreakdownResponse `json:"liability_breakdowns"`
}

type LiabilitiesRepaymentResponse struct {
	Repayments []PostingResponse `json:"repayments"`
}
