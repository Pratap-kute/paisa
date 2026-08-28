package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type InsightResponse struct {
	ID                     string           `json:"id"`
	Type                   string           `json:"type"`
	Category               string           `json:"category"`
	Severity               string           `json:"severity"`
	Score                  int              `json:"score"`
	Value                  *decimal.Decimal `json:"value,omitempty"`
	PreviousValue          *decimal.Decimal `json:"previousValue,omitempty"`
	Change                 *decimal.Decimal `json:"change,omitempty"`
	ChangePercent          *decimal.Decimal `json:"changePercent,omitempty"`
	InvestmentContribution *decimal.Decimal `json:"investmentContribution,omitempty"`
	GainContribution       *decimal.Decimal `json:"gainContribution,omitempty"`
	Period                 string           `json:"period"`
	ComparisonPeriod       string           `json:"comparisonPeriod,omitempty"`
	Account                string           `json:"account,omitempty"`
	RelatedAccounts        []string         `json:"relatedAccounts,omitempty"`
	Href                   string           `json:"href,omitempty"`
}

type InsightsResponse struct {
	Period           string            `json:"period"`
	ComparisonPeriod string            `json:"comparisonPeriod"`
	AsOf             time.Time         `json:"asOf"`
	IsPartial        bool              `json:"isPartial"`
	Insights         []InsightResponse `json:"insights"`
}
