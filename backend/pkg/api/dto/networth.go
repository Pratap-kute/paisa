package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type NetworthTimelineItemResponse struct {
	Date                time.Time       `json:"date"`
	InvestmentAmount    decimal.Decimal `json:"investmentAmount"`
	WithdrawalAmount    decimal.Decimal `json:"withdrawalAmount"`
	GainAmount          decimal.Decimal `json:"gainAmount"`
	BalanceAmount       decimal.Decimal `json:"balanceAmount"`
	BalanceUnits        decimal.Decimal `json:"balanceUnits"`
	NetInvestmentAmount decimal.Decimal `json:"netInvestmentAmount"`
}

type NetworthResponse struct {
	NetworthTimeline []NetworthTimelineItemResponse `json:"networthTimeline"`
	XIRR             decimal.Decimal                `json:"xirr"`
}

type CurrentNetworthResponse struct {
	Networth NetworthTimelineItemResponse `json:"networth"`
	XIRR     decimal.Decimal              `json:"xirr"`
}
