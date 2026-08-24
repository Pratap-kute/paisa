package dto

import (
	"github.com/shopspring/decimal"
)

type NodeResponse struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type LinkResponse struct {
	Source uint            `json:"source"`
	Target uint            `json:"target"`
	Value  decimal.Decimal `json:"value"`
}

type GraphResponse struct {
	Nodes []NodeResponse `json:"nodes"`
	Links []LinkResponse `json:"links"`
}

type PeriodicPostingsSummaryResponse struct {
	Expenses    map[string][]PostingResponse `json:"expenses"`
	Incomes     map[string][]PostingResponse `json:"incomes"`
	Investments map[string][]PostingResponse `json:"investments"`
	Taxes       map[string][]PostingResponse `json:"taxes"`
}

type ExpenseResponse struct {
	Expenses  []PostingResponse               `json:"expenses"`
	MonthWise PeriodicPostingsSummaryResponse `json:"month_wise"`
	YearWise  PeriodicPostingsSummaryResponse `json:"year_wise"`
	Graph     map[string]GraphResponse        `json:"graph"`
}
