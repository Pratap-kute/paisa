package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type IncomeYearlyCard struct {
	StartDate   time.Time
	EndDate     time.Time
	Postings    []posting.Posting
	GrossIncome decimal.Decimal
	NetTax      decimal.Decimal
	NetIncome   decimal.Decimal
}

type Income struct {
	Date     time.Time
	Postings []posting.Posting
}

type Tax struct {
	StartDate time.Time
	EndDate   time.Time
	Postings  []posting.Posting
}

type IncomeResult struct {
	IncomeTimeline []Income
	TaxTimeline    []Tax
	YearlyCards    []IncomeYearlyCard
}

func GetIncome(db *gorm.DB) IncomeResult {
	incomePostings := query.Init(db).Like("Income:%").All()
	taxPostings := query.Init(db).AccountPrefix("Expenses:Tax").All()
	p := query.Init(db).First()

	if p == nil {
		return IncomeResult{
			IncomeTimeline: []Income{},
			TaxTimeline:    []Tax{},
			YearlyCards:    []IncomeYearlyCard{},
		}
	}

	return IncomeResult{
		IncomeTimeline: ComputeIncomeTimeline(incomePostings),
		TaxTimeline:    ComputeTaxTimeline(taxPostings),
		YearlyCards:    ComputeIncomeYearlyCard(p.Date, taxPostings, incomePostings),
	}
}

func ComputeIncomeTimeline(postings []posting.Posting) []Income {
	incomes := make([]Income, 0)

	if len(postings) == 0 {
		return incomes
	}

	var p posting.Posting
	end := utils.EndOfToday()
	for start := utils.BeginningOfMonth(postings[0].Date); start.Before(end); start = start.AddDate(0, 1, 0) {
		currentMonthPostings := make([]posting.Posting, 0)
		for len(postings) > 0 && (postings[0].Date.Before(utils.EndOfMonth(start)) || postings[0].Date.Equal(start)) {
			p, postings = postings[0], postings[1:]
			currentMonthPostings = append(currentMonthPostings, p)
		}

		incomes = append(incomes, Income{Date: start, Postings: currentMonthPostings})
	}
	return incomes
}

func ComputeTaxTimeline(postings []posting.Posting) []Tax {
	taxes := make([]Tax, 0)

	if len(postings) == 0 {
		return taxes
	}

	var p posting.Posting
	end := utils.EndOfToday()
	for start := utils.BeginningOfFinancialYear(postings[0].Date); start.Before(end); start = start.AddDate(1, 0, 0) {
		yearEnd := utils.EndOfFinancialYear(start)
		currentMonthPostings := make([]posting.Posting, 0)
		for len(postings) > 0 && (postings[0].Date.Before(yearEnd) || postings[0].Date.Equal(start)) {
			p, postings = postings[0], postings[1:]
			currentMonthPostings = append(currentMonthPostings, p)
		}

		taxes = append(taxes, Tax{StartDate: start, EndDate: yearEnd, Postings: currentMonthPostings})
	}
	return taxes
}

func ComputeIncomeYearlyCard(start time.Time, taxes []posting.Posting, incomes []posting.Posting) []IncomeYearlyCard {
	yearlyCards := make([]IncomeYearlyCard, 0)

	var p posting.Posting
	end := utils.EndOfToday()
	for start = utils.BeginningOfFinancialYear(start); start.Before(end); start = start.AddDate(1, 0, 0) {
		yearEnd := utils.EndOfFinancialYear(start)
		netTax := decimal.Zero
		for len(taxes) > 0 && utils.IsWithDate(taxes[0].Date, start, yearEnd) {
			p, taxes = taxes[0], taxes[1:]
			netTax = netTax.Add(p.Amount)
		}

		currentYearIncomes := make([]posting.Posting, 0)
		for len(incomes) > 0 && utils.IsWithDate(incomes[0].Date, start, yearEnd) {
			p, incomes = incomes[0], incomes[1:]
			currentYearIncomes = append(currentYearIncomes, p)
		}

		grossIncome := utils.SumBy(currentYearIncomes, func(p posting.Posting) decimal.Decimal {
			return p.Amount.Neg()
		})

		yearlyCards = append(yearlyCards, IncomeYearlyCard{
			StartDate:   start,
			EndDate:     yearEnd,
			Postings:    currentYearIncomes,
			NetTax:      netTax,
			GrossIncome: grossIncome,
			NetIncome:   grossIncome.Sub(netTax),
		})
	}
	return yearlyCards
}
