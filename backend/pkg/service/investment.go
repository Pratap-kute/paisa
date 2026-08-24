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

		currentYearTaxes := make([]posting.Posting, 0)
		currentYearExpenses := make([]posting.Posting, 0)

		for len(expenses) > 0 && utils.IsWithDate(expenses[0].Date, start, yearEnd) {
			p, expenses = expenses[0], expenses[1:]
			if utils.IsSameOrParent(p.Account, "Expenses:Tax") {
				currentYearTaxes = append(currentYearTaxes, p)
			} else {
				currentYearExpenses = append(currentYearExpenses, p)
			}
		}

		netTax := accounting.CostSum(currentYearTaxes)
		netExpense := accounting.CostSum(currentYearExpenses)

		currentYearIncomes := make([]posting.Posting, 0)
		for len(incomes) > 0 && utils.IsWithDate(incomes[0].Date, start, yearEnd) {
			p, incomes = incomes[0], incomes[1:]
			currentYearIncomes = append(currentYearIncomes, p)
		}

		grossSalaryIncome := utils.SumBy(currentYearIncomes, func(p posting.Posting) decimal.Decimal {
			if strings.HasPrefix(p.Account, "Income:Salary") {
				return p.Amount.Neg()
			} else {
				return decimal.Zero
			}
		})
		grossOtherIncome := utils.SumBy(currentYearIncomes, func(p posting.Posting) decimal.Decimal {
			if !strings.HasPrefix(p.Account, "Income:Salary") {
				return p.Amount.Neg()
			} else {
				return decimal.Zero
			}
		})

		netInvestment := accounting.CostSum(currentYearPostings)

		netIncome := grossSalaryIncome.Add(grossOtherIncome).Sub(netTax)
		savingsRate := decimal.Zero
		if !netIncome.Equal(decimal.Zero) {
			savingsRate = netInvestment.Div(netIncome).Mul(decimal.NewFromInt(100))
		}

		yearlyCards = append(yearlyCards, InvestmentYearlyCard{
			StartDate:         start,
			EndDate:           yearEnd,
			Postings:          currentYearPostings,
			NetTax:            netTax,
			GrossSalaryIncome: grossSalaryIncome,
			GrossOtherIncome:  grossOtherIncome,
			NetIncome:         netIncome,
			NetInvestment:     netInvestment,
			NetExpense:        netExpense,
			SavingsRate:       savingsRate,
		})
	}
	return yearlyCards
}
