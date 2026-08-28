package service

import (
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type SavingsSummary struct {
	StartDate         time.Time
	EndDate           time.Time
	GrossSalaryIncome decimal.Decimal
	GrossOtherIncome  decimal.Decimal
	NetTax            decimal.Decimal
	NetIncome         decimal.Decimal
	NetInvestment     decimal.Decimal
	NetExpense        decimal.Decimal
	SavingsRate       decimal.Decimal
}

type InvestmentYearlyCard struct {
	StartDate         time.Time
	EndDate           time.Time
	Postings          []posting.Posting
	GrossSalaryIncome decimal.Decimal
	GrossOtherIncome  decimal.Decimal
	NetTax            decimal.Decimal
	NetIncome         decimal.Decimal
	NetInvestment     decimal.Decimal
	NetExpense        decimal.Decimal
	SavingsRate       decimal.Decimal
}

type InvestmentResult struct {
	Assets      []posting.Posting
	YearlyCards []InvestmentYearlyCard
}

func GetInvestment(db *gorm.DB) InvestmentResult {
	assets := query.Init(db).Like("Assets:%").NotAccountPrefix("Assets:Checking").
		Where("transaction_id not in (select transaction_id from postings p where p.account like ? and p.transaction_id = transaction_id)", "Liabilities:%").
		All()
	incomes := query.Init(db).Like("Income:%").All()
	expenses := query.Init(db).Like("Expenses:%").All()
	p := query.Init(db).First()

	if p == nil {
		return InvestmentResult{
			Assets:      []posting.Posting{},
			YearlyCards: []InvestmentYearlyCard{},
		}
	}

	assets = lo.Filter(assets, func(p posting.Posting, _ int) bool { return !IsStockSplit(db, p) })
	return InvestmentResult{
		Assets:      assets,
		YearlyCards: ComputeInvestmentYearlyCard(p.Date, assets, expenses, incomes),
	}
}

func ComputeSavingsSummary(assets, expenses, incomes []posting.Posting, start, end time.Time) SavingsSummary {
	currentPostings := make([]posting.Posting, 0)
	for i := range assets {
		if utils.IsWithDate(assets[i].Date, start, end) {
			currentPostings = append(currentPostings, assets[i])
		}
	}

	currentTaxes := make([]posting.Posting, 0)
	currentExpenses := make([]posting.Posting, 0)
	for i := range expenses {
		if utils.IsWithDate(expenses[i].Date, start, end) {
			if utils.IsSameOrParent(expenses[i].Account, "Expenses:Tax") {
				currentTaxes = append(currentTaxes, expenses[i])
			} else {
				currentExpenses = append(currentExpenses, expenses[i])
			}
		}
	}

	currentIncomes := make([]posting.Posting, 0)
	for i := range incomes {
		if utils.IsWithDate(incomes[i].Date, start, end) {
			currentIncomes = append(currentIncomes, incomes[i])
		}
	}

	netTax := accounting.CostSum(currentTaxes)
	netExpense := accounting.CostSum(currentExpenses)

	grossSalaryIncome := utils.SumBy(currentIncomes, func(p posting.Posting) decimal.Decimal {
		if strings.HasPrefix(p.Account, "Income:Salary") {
			return p.Amount.Neg()
		}
		return decimal.Zero
	})
	grossOtherIncome := utils.SumBy(currentIncomes, func(p posting.Posting) decimal.Decimal {
		if !strings.HasPrefix(p.Account, "Income:Salary") {
			return p.Amount.Neg()
		}
		return decimal.Zero
	})

	netInvestment := accounting.CostSum(currentPostings)
	netIncome := grossSalaryIncome.Add(grossOtherIncome).Sub(netTax)
	savingsRate := decimal.Zero
	if !netIncome.Equal(decimal.Zero) {
		savingsRate = netInvestment.Div(netIncome).Mul(decimal.NewFromInt(100))
	}

	return SavingsSummary{
		StartDate:         start,
		EndDate:           end,
		GrossSalaryIncome: grossSalaryIncome,
		GrossOtherIncome:  grossOtherIncome,
		NetTax:            netTax,
		NetIncome:         netIncome,
		NetInvestment:     netInvestment,
		NetExpense:        netExpense,
		SavingsRate:       savingsRate,
	}
}

func ComputeInvestmentYearlyCard(start time.Time, assets []posting.Posting, expenses []posting.Posting, incomes []posting.Posting) []InvestmentYearlyCard {
	yearlyCards := make([]InvestmentYearlyCard, 0)

	if len(assets) == 0 {
		return yearlyCards
	}

	var p posting.Posting
	end := utils.EndOfToday()
	for start = utils.BeginningOfFinancialYear(start); start.Before(end); start = start.AddDate(1, 0, 0) {
		yearEnd := utils.EndOfFinancialYear(start)
		currentYearPostings := make([]posting.Posting, 0)
		for len(assets) > 0 && utils.IsWithDate(assets[0].Date, start, yearEnd) {
			p, assets = assets[0], assets[1:]
			currentYearPostings = append(currentYearPostings, p)
		}

		currentYearExpenses := make([]posting.Posting, 0)
		for len(expenses) > 0 && utils.IsWithDate(expenses[0].Date, start, yearEnd) {
			p, expenses = expenses[0], expenses[1:]
			currentYearExpenses = append(currentYearExpenses, p)
		}

		currentYearIncomes := make([]posting.Posting, 0)
		for len(incomes) > 0 && utils.IsWithDate(incomes[0].Date, start, yearEnd) {
			p, incomes = incomes[0], incomes[1:]
			currentYearIncomes = append(currentYearIncomes, p)
		}

		savingsSummary := ComputeSavingsSummary(currentYearPostings, currentYearExpenses, currentYearIncomes, start, yearEnd)

		yearlyCards = append(yearlyCards, InvestmentYearlyCard{
			StartDate:         start,
			EndDate:           yearEnd,
			Postings:          currentYearPostings,
			NetTax:            savingsSummary.NetTax,
			GrossSalaryIncome: savingsSummary.GrossSalaryIncome,
			GrossOtherIncome:  savingsSummary.GrossOtherIncome,
			NetIncome:         savingsSummary.NetIncome,
			NetInvestment:     savingsSummary.NetInvestment,
			NetExpense:        savingsSummary.NetExpense,
			SavingsRate:       savingsSummary.SavingsRate,
		})
	}
	return yearlyCards
}
