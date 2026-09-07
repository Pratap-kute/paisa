package dto

import "github.com/shopspring/decimal"

type ScenarioAssumption struct {
	Value       *decimal.Decimal `json:"value" extensions:"x-nullable"`
	Source      string           `json:"source"`
	SampleCount int              `json:"sampleCount"`
}

type ScenarioReason struct {
	Code  string `json:"code"`
	Field string `json:"field"`
}

type ScenarioQuality struct {
	Status  string           `json:"status"`
	Reasons []ScenarioReason `json:"reasons"`
}

type ScenarioBaseline struct {
	AsOfDate                  string             `json:"asOfDate"`
	StartDate                 string             `json:"startDate"`
	Currency                  string             `json:"currency"`
	HorizonMonths             int                `json:"horizonMonths"`
	CurrentCash               *decimal.Decimal   `json:"currentCash" extensions:"x-nullable"`
	CurrentInvestmentValue    decimal.Decimal    `json:"currentInvestmentValue"`
	CurrentNetWorth           decimal.Decimal    `json:"currentNetWorth"`
	StaticNetWorthComponent   *decimal.Decimal   `json:"staticNetWorthComponent" extensions:"x-nullable"`
	MonthlyIncome             ScenarioAssumption `json:"monthlyIncome"`
	MonthlyExpenses           ScenarioAssumption `json:"monthlyExpenses"`
	MonthlyInvestmentTransfer ScenarioAssumption `json:"monthlyInvestmentTransfer"`
	Quality                   ScenarioQuality    `json:"quality"`
}

type ScenarioEvent struct {
	Month  string          `json:"month"`
	Type   string          `json:"type"`
	Amount decimal.Decimal `json:"amount"`
	Label  string          `json:"label"`
}

type ScenarioRequest struct {
	HorizonMonths                  int              `json:"horizonMonths"`
	MonthlyIncome                  *decimal.Decimal `json:"monthlyIncome" extensions:"x-nullable"`
	MonthlyExpenses                *decimal.Decimal `json:"monthlyExpenses" extensions:"x-nullable"`
	MonthlyInvestmentTransfer      *decimal.Decimal `json:"monthlyInvestmentTransfer" extensions:"x-nullable"`
	AnnualInvestmentReturn         *decimal.Decimal `json:"annualInvestmentReturn" extensions:"x-nullable"`
	ScenarioAnnualInvestmentReturn *decimal.Decimal `json:"scenarioAnnualInvestmentReturn" extensions:"x-nullable"`
	OneTimeEvents                  []ScenarioEvent  `json:"oneTimeEvents"`
}

type ScenarioPoint struct {
	Month              string          `json:"month"`
	Income             decimal.Decimal `json:"income"`
	Expenses           decimal.Decimal `json:"expenses"`
	InvestmentTransfer decimal.Decimal `json:"investmentTransfer"`
	InvestmentGrowth   decimal.Decimal `json:"investmentGrowth"`
	Cash               decimal.Decimal `json:"cash"`
	Investment         decimal.Decimal `json:"investment"`
	NetWorth           decimal.Decimal `json:"netWorth"`
}

type ScenarioProjection struct {
	StartDate                string          `json:"startDate"`
	EndDate                  string          `json:"endDate"`
	OpeningCash              decimal.Decimal `json:"openingCash"`
	OpeningInvestment        decimal.Decimal `json:"openingInvestment"`
	OpeningNetWorth          decimal.Decimal `json:"openingNetWorth"`
	EndingCash               decimal.Decimal `json:"endingCash"`
	EndingInvestment         decimal.Decimal `json:"endingInvestment"`
	EndingNetWorth           decimal.Decimal `json:"endingNetWorth"`
	MinimumCashBalance       decimal.Decimal `json:"minimumCashBalance"`
	TotalIncome              decimal.Decimal `json:"totalIncome"`
	TotalExpenses            decimal.Decimal `json:"totalExpenses"`
	TotalInvestmentTransfers decimal.Decimal `json:"totalInvestmentTransfers"`
	TotalInvestmentGrowth    decimal.Decimal `json:"totalInvestmentGrowth"`
	OpeningCashNegative      bool            `json:"openingCashNegative"`
	FirstNegativeCashMonth   *string         `json:"firstNegativeCashMonth" extensions:"x-nullable"`
	Points                   []ScenarioPoint `json:"points"`
}

type ScenarioImpact struct {
	EndingCashDelta       decimal.Decimal `json:"endingCashDelta"`
	EndingInvestmentDelta decimal.Decimal `json:"endingInvestmentDelta"`
	EndingNetWorthDelta   decimal.Decimal `json:"endingNetWorthDelta"`
	InvestmentGrowthDelta decimal.Decimal `json:"investmentGrowthDelta"`
	MinimumCashDelta      decimal.Decimal `json:"minimumCashDelta"`
}

type ScenarioAssumptions struct {
	AnnualInvestmentReturn         decimal.Decimal `json:"annualInvestmentReturn"`
	ScenarioAnnualInvestmentReturn decimal.Decimal `json:"scenarioAnnualInvestmentReturn"`
	HorizonMonths                  int             `json:"horizonMonths"`
}

type ScenarioResult struct {
	Available   bool                `json:"available"`
	Snapshot    ScenarioBaseline    `json:"snapshot"`
	Baseline    *ScenarioProjection `json:"baseline" extensions:"x-nullable"`
	Scenario    *ScenarioProjection `json:"scenario" extensions:"x-nullable"`
	Impact      *ScenarioImpact     `json:"impact" extensions:"x-nullable"`
	Assumptions ScenarioAssumptions `json:"assumptions"`
	Quality     ScenarioQuality     `json:"quality"`
}
