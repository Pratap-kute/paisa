package service

import (
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type AccountBudget struct {
	Account    string
	Forecast   decimal.Decimal
	Actual     decimal.Decimal
	Rollover   decimal.Decimal
	Available  decimal.Decimal
	Date       time.Time
	Expenses   []posting.Posting
	Projection *AccountBudgetProjection
}

type Budget struct {
	Date               time.Time
	Accounts           []AccountBudget
	AvailableThisMonth decimal.Decimal
	EndOfMonthBalance  decimal.Decimal
	Forecast           decimal.Decimal
	Outlook            *BudgetOutlook
}

type BudgetResult struct {
	BudgetsByMonth        map[string]Budget
	CheckingBalance       decimal.Decimal
	AvailableForBudgeting decimal.Decimal
}

func GetBudget(db *gorm.DB) BudgetResult {
	forecastPostings := query.Init(db).Like("Expenses:%").Forecast().All()
	expenses := query.Init(db).Like("Expenses:%").All()
	return ComputeBudget(db, forecastPostings, expenses)
}

func GetCurrentBudget(db *gorm.DB) BudgetResult {
	forecastPostings := query.Init(db).Like("Expenses:%").Forecast().UntilThisMonthEnd().All()
	expenses := query.Init(db).Like("Expenses:%").UntilThisMonthEnd().All()
	return ComputeBudget(db, forecastPostings, expenses)
}

func ComputeBudget(db *gorm.DB, forecastPostings, expensesPostings []posting.Posting) BudgetResult {
	var checkingBalance decimal.Decimal
	if db != nil {
		checkingBalance = accounting.CostSum(query.Init(db).AccountPrefix("Assets:Checking").All())
	}
	availableForBudgeting := checkingBalance

	forecasts := utils.GroupByMonth(forecastPostings)
	expenses := utils.GroupByMonth(expensesPostings)

	accounts := lo.Uniq(lo.Map(forecastPostings, func(p posting.Posting, _ int) string {
		return p.Account
	}))
	sort.Strings(accounts)

	budgetsByMonth := make(map[string]Budget)
	balance := make(map[string]decimal.Decimal)

	currentMonth := lo.Must(time.ParseInLocation("2006-01", utils.Now().Format("2006-01"), config.TimeZone()))

	if len(forecastPostings) > 0 {
		start := utils.BeginningOfMonth(forecastPostings[0].Date)
		end := utils.EndOfMonth(forecastPostings[len(forecastPostings)-1].Date)

		for start := start; start.Before(end) || start.Equal(end); start = start.AddDate(0, 1, 0) {
			month := start.Format("2006-01")
			accountBudgets := make([]AccountBudget, 0, len(accounts))

			forecastsByMonth := forecasts[month]
			date := lo.Must(time.ParseInLocation("2006-01", month, config.TimeZone()))
			expensesByMonth, ok := expenses[month]
			if !ok {
				expensesByMonth = []posting.Posting{}
			}

			forecastsByAccount := accounting.GroupByAccount(forecastsByMonth)
			expensesByAssignedAccount := AssignExpensesToAccounts(accounts, expensesByMonth)

			for _, account := range accounts {
				fs := forecastsByAccount[account]
				es := expensesByAssignedAccount[account]
				if !ok {
					es = []posting.Posting{}
				}

				budget := buildBudget(date, account, balance[account], fs, es, date.Before(currentMonth))
				if budget.Available.IsPositive() {
					balance[account] = budget.Available
				} else {
					balance[account] = decimal.Zero
				}

				accountBudgets = append(accountBudgets, budget)
			}

			var outlook *BudgetOutlook
			if date.Equal(currentMonth) {
				asOf := utils.Now()
				endOfToday := utils.EndOfToday()

				var accountHistories map[string][]BudgetHistoryMonth
				if db != nil {
					histStart := utils.BeginningOfMonth(currentMonth.AddDate(0, -6, 0))
					histEnd := currentMonth
					histExpenses := query.Init(db).Like("Expenses:%").Between(histStart, histEnd).All()
					histByMonth := utils.GroupByMonth(histExpenses)

					accountHistories = make(map[string][]BudgetHistoryMonth, len(accounts))
					for _, acc := range accounts {
						accountHistories[acc] = make([]BudgetHistoryMonth, 0, 6)
					}

					for k := 1; k <= 6; k++ {
						hMonth := currentMonth.AddDate(0, -k, 0)
						hMonthStr := hMonth.Format("2006-01")
						hExpenses, hasData := histByMonth[hMonthStr]
						hAssigned := AssignExpensesToAccounts(accounts, hExpenses)

						asOfDay := asOf.Day()
						daysInHMonth := utils.EndOfMonth(hMonth).Day()
						cutoffDay := min(asOfDay, daysInHMonth)
						cutoff := time.Date(hMonth.Year(), hMonth.Month(), cutoffDay, 23, 59, 59, 999999999, config.TimeZone())

						for _, acc := range accounts {
							accEs := hAssigned[acc]
							fullSpend := accounting.CostSum(accEs)
							cutoffEs := lo.Filter(accEs, func(p posting.Posting, _ int) bool {
								return p.Date.Before(cutoff) || p.Date.Equal(cutoff)
							})
							spendThrough := accounting.CostSum(cutoffEs)

							accountHistories[acc] = append(accountHistories[acc], BudgetHistoryMonth{
								Month:               hMonth,
								MonthHasExpenseData: hasData && len(hExpenses) > 0,
								FullMonthSpend:      fullSpend,
								SpendThroughAsOfDay: spendThrough,
							})
						}
					}
				}

				for i := range accountBudgets {
					acc := &accountBudgets[i]
					observedExpenses := lo.Filter(acc.Expenses, func(p posting.Posting, _ int) bool {
						return p.Date.Before(endOfToday) || p.Date.Equal(endOfToday)
					})
					observedSpend := accounting.CostSum(observedExpenses)

					var hist []BudgetHistoryMonth
					if accountHistories != nil {
						hist = accountHistories[acc.Account]
					}
					proj := ProjectAccountBudget(*acc, observedSpend, hist, asOf)
					acc.Projection = &proj
				}

				outlook = ComputeBudgetOutlook(accountBudgets)
			}

			availableThisMonth := utils.SumBy(
				accountBudgets, func(budget AccountBudget) decimal.Decimal {
					if budget.Available.IsPositive() {
						return budget.Available
					}
					return decimal.Zero
				},
			)

			forecast := utils.SumBy(
				accountBudgets, func(budget AccountBudget) decimal.Decimal {
					if budget.Forecast.IsPositive() {
						return budget.Forecast
					}
					return decimal.Zero
				},
			)

			availableForBudgeting = availableForBudgeting.Sub(availableThisMonth)
			endOfMonthBalance := availableForBudgeting

			budgetsByMonth[month] = Budget{
				Date:               date,
				Accounts:           accountBudgets,
				EndOfMonthBalance:  endOfMonthBalance,
				AvailableThisMonth: availableThisMonth,
				Forecast:           forecast,
				Outlook:            outlook,
			}
		}
	}

	return BudgetResult{
		BudgetsByMonth:        budgetsByMonth,
		CheckingBalance:       checkingBalance,
		AvailableForBudgeting: availableForBudgeting,
	}
}

func buildBudget(date time.Time, account string, balance decimal.Decimal, forecasts []posting.Posting, expenses []posting.Posting, past bool) AccountBudget {
	forecast := accounting.CostSum(forecasts)
	actual := accounting.CostSum(expenses)

	rollover := decimal.Zero
	available := forecast.Sub(actual)
	if past {
		available = decimal.Zero
	}
	if config.GetConfig().Budget.Rollover == config.Yes {
		rollover = balance
		available = balance.Add(forecast.Sub(actual))
	}

	return AccountBudget{
		Account:   account,
		Forecast:  forecast,
		Actual:    actual,
		Rollover:  rollover,
		Available: available,
		Date:      date,
		Expenses:  expenses,
	}
}

func AssignExpensesToAccounts(accounts []string, expenses []posting.Posting) map[string][]posting.Posting {
	expensesByAccount := accounting.GroupByAccount(expenses)
	result := make(map[string][]posting.Posting, len(accounts))

	sortedAccounts := make([]string, len(accounts))
	copy(sortedAccounts, accounts)
	sort.Slice(sortedAccounts, func(i, j int) bool {
		depthI := strings.Count(sortedAccounts[i], ":")
		depthJ := strings.Count(sortedAccounts[j], ":")
		if depthI != depthJ {
			return depthI > depthJ
		}
		return sortedAccounts[i] < sortedAccounts[j]
	})

	for _, account := range sortedAccounts {
		result[account] = popExpenses(account, expensesByAccount)
	}
	return result
}

func popExpenses(forecastAccount string, expensesByAccount map[string][]posting.Posting) []posting.Posting {
	expenses := []posting.Posting{}
	for account, es := range expensesByAccount {
		if utils.IsSameOrParent(account, forecastAccount) {
			expenses = append(expenses, es...)
			delete(expensesByAccount, account)
		}
	}
	return expenses
}
