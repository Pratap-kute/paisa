package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type IncomeYearlyCardResponse struct {
	StartDate   time.Time         `json:"start_date"`
	EndDate     time.Time         `json:"end_date"`
	Postings    []PostingResponse `json:"postings"`
	GrossIncome decimal.Decimal   `json:"gross_income"`
	NetTax      decimal.Decimal   `json:"net_tax"`
	NetIncome   decimal.Decimal   `json:"net_income"`
}

type IncomeTimelineItemResponse struct {
	Date     time.Time         `json:"date"`
	Postings []PostingResponse `json:"postings"`
}

type TaxTimelineItemResponse struct {
	StartDate time.Time         `json:"start_date"`
	EndDate   time.Time         `json:"end_date"`
	Postings  []PostingResponse `json:"postings"`
}

type IncomeResponse struct {
	IncomeTimeline []IncomeTimelineItemResponse `json:"income_timeline"`
	TaxTimeline    []TaxTimelineItemResponse    `json:"tax_timeline"`
	YearlyCards    []IncomeYearlyCardResponse   `json:"yearly_cards"`
}

type IncomeStatementItemResponse struct {
	StartingBalance decimal.Decimal            `json:"startingBalance"`
	EndingBalance   decimal.Decimal            `json:"endingBalance"`
	Date            time.Time                  `json:"date"`
	Income          map[string]decimal.Decimal `json:"income"`
	Interest        map[string]decimal.Decimal `json:"interest"`
	Equity          map[string]decimal.Decimal `json:"equity"`
	Pnl             map[string]decimal.Decimal `json:"pnl"`
	Liabilities     map[string]decimal.Decimal `json:"liabilities"`
	Tax             map[string]decimal.Decimal `json:"tax"`
	Expenses        map[string]decimal.Decimal `json:"expenses"`
}

type IncomeStatementResponse struct {
	Yearly map[string]IncomeStatementItemResponse `json:"yearly"`
}
