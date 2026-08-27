package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type PriceItemResponse struct {
	ID            uint            `json:"id"`
	Date          time.Time       `json:"date"`
	CommodityType string          `json:"commodity_type"`
	CommodityID   string          `json:"commodity_id"`
	CommodityName string          `json:"commodity_name"`
	Value         decimal.Decimal `json:"value"`
}

type PricesResponse struct {
	Prices map[string][]PriceItemResponse `json:"prices"`
}

type PriceProviderResponse struct {
	Code        string   `json:"code"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Fields      []string `json:"fields"`
}

type PriceProvidersResponse struct {
	Providers []PriceProviderResponse `json:"providers"`
}

type AutoCompleteItemResponse struct {
	Label string `json:"label"`
	ID    string `json:"id"`
}

type AutoCompleteResponse struct {
	Completions []AutoCompleteItemResponse `json:"completions"`
}
