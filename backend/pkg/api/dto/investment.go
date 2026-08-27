package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type InvestmentYearlyCardResponse struct {
	StartDate         time.Time         `json:"start_date"`
	EndDate           time.Time         `json:"end_date"`
	Postings          []PostingResponse `json:"postings"`
	GrossSalaryIncome decimal.Decimal   `json:"gross_salary_income"`
	GrossOtherIncome  decimal.Decimal   `json:"gross_other_income"`
	NetTax            decimal.Decimal   `json:"net_tax"`
	NetIncome         decimal.Decimal   `json:"net_income"`
	NetInvestment     decimal.Decimal   `json:"net_investment"`
	NetExpense        decimal.Decimal   `json:"net_expense"`
	SavingsRate       decimal.Decimal   `json:"savings_rate"`
}

type InvestmentResponse struct {
	Assets      []PostingResponse              `json:"assets"`
	YearlyCards []InvestmentYearlyCardResponse `json:"yearly_cards"`
}
