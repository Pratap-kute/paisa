package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type CashFlowResponse struct {
	Date        time.Time       `json:"date"`
	Income      decimal.Decimal `json:"income"`
	Expenses    decimal.Decimal `json:"expenses"`
	Liabilities decimal.Decimal `json:"liabilities"`
	Investment  decimal.Decimal `json:"investment"`
	Tax         decimal.Decimal `json:"tax"`
	Checking    decimal.Decimal `json:"checking"`
	Balance     decimal.Decimal `json:"balance"`
}

type CashFlowsResponse struct {
	CashFlows []CashFlowResponse `json:"cash_flows"`
}
