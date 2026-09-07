package dto

import "github.com/shopspring/decimal"

type PerformanceReason struct {
	Code      string `json:"code"`
	Account   string `json:"account,omitempty"`
	Commodity string `json:"commodity,omitempty"`
	Date      string `json:"date,omitempty"`
}

type PerformanceQuality struct {
	Status  string              `json:"status"`
	Reasons []PerformanceReason `json:"reasons"`
}

type PerformanceQuote struct {
	Commodity string `json:"commodity"`
	Date      string `json:"date"`
	Source    string `json:"source"`
}

type PerformancePoint struct {
	Date                 string             `json:"date"`
	Value                decimal.Decimal    `json:"value"`
	ContributionBaseline decimal.Decimal    `json:"contributionBaseline"`
	Quality              PerformanceQuality `json:"quality"`
	Quotes               []PerformanceQuote `json:"quotes"`
}

type InvestmentPerformance struct {
	StartDate               string              `json:"startDate"`
	EndDate                 string              `json:"endDate"`
	Account                 string              `json:"account"`
	OpeningValue            decimal.Decimal     `json:"openingValue"`
	ClosingValue            decimal.Decimal     `json:"closingValue"`
	Contributions           decimal.Decimal     `json:"contributions"`
	Withdrawals             decimal.Decimal     `json:"withdrawals"`
	NetContribution         decimal.Decimal     `json:"netContribution"`
	PortfolioChange         decimal.Decimal     `json:"portfolioChange"`
	InvestmentReturn        decimal.Decimal     `json:"investmentReturn"`
	PeriodReturn            *decimal.Decimal    `json:"periodReturn" extensions:"x-nullable"`
	SinceInceptionXIRR      *decimal.Decimal    `json:"sinceInceptionXirr" extensions:"x-nullable"`
	ReturnUnavailableReason *string             `json:"returnUnavailableReason" extensions:"x-nullable"`
	Quality                 PerformanceQuality  `json:"quality"`
	OpeningQuotes           []PerformanceQuote  `json:"openingQuotes"`
	ClosingQuotes           []PerformanceQuote  `json:"closingQuotes"`
	Drivers                 []PerformanceDriver `json:"drivers,omitempty"`
	Timeline                []PerformancePoint  `json:"timeline,omitempty"`
}

type PerformanceDriver struct {
	Account                 string             `json:"account"`
	OpeningValue            decimal.Decimal    `json:"openingValue"`
	ClosingValue            decimal.Decimal    `json:"closingValue"`
	NetContribution         decimal.Decimal    `json:"netContribution"`
	ReturnAmount            decimal.Decimal    `json:"returnAmount"`
	PeriodReturn            *decimal.Decimal   `json:"periodReturn" extensions:"x-nullable"`
	ReturnUnavailableReason *string            `json:"returnUnavailableReason" extensions:"x-nullable"`
	Quality                 PerformanceQuality `json:"quality"`
}
