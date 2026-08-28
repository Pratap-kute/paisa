package service

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type InsightType string

const (
	InsightTypeExpenseChange           InsightType = "expense_change"
	InsightTypeCategorySpike           InsightType = "category_spike"
	InsightTypeSavingsRateChange       InsightType = "savings_rate_change"
	InsightTypeNetworthChange          InsightType = "networth_change"
	InsightTypeNetworthContribution    InsightType = "networth_contribution"
	InsightTypeBudgetRisk              InsightType = "budget_risk"
	InsightTypeBudgetOverspent         InsightType = "budget_overspent"
	InsightTypeRecurringIncrease       InsightType = "recurring_increase"
	InsightTypeAllocationConcentration InsightType = "allocation_concentration"
	InsightTypeCashWarning             InsightType = "cash_warning"
)

type InsightCategory string

const (
	InsightCategorySpending   InsightCategory = "spending"
	InsightCategorySavings    InsightCategory = "savings"
	InsightCategoryNetworth   InsightCategory = "networth"
	InsightCategoryBudget     InsightCategory = "budget"
	InsightCategoryRecurring  InsightCategory = "recurring"
	InsightCategoryInvestment InsightCategory = "investment"
	InsightCategoryCash       InsightCategory = "cash"
)

const (
	hrefExpenseMonthly = "/expense/monthly"
	hrefExpenseBudget  = "/expense/budget"
)

type InsightSeverity string

const (
	InsightSeverityPositive InsightSeverity = "positive"
	InsightSeverityInfo     InsightSeverity = "info"
	InsightSeverityWarning  InsightSeverity = "warning"
	InsightSeverityCritical InsightSeverity = "critical"
)

type Insight struct {
	ID                     string           `json:"id"`
	Type                   InsightType      `json:"type"`
	Category               InsightCategory  `json:"category"`
	Severity               InsightSeverity  `json:"severity"`
	Score                  int              `json:"score"`
	Value                  *decimal.Decimal `json:"value,omitempty"`
	PreviousValue          *decimal.Decimal `json:"previousValue,omitempty"`
	Change                 *decimal.Decimal `json:"change,omitempty"`
	ChangePercent          *decimal.Decimal `json:"changePercent,omitempty"`
	InvestmentContribution *decimal.Decimal `json:"investmentContribution,omitempty"`
	GainContribution       *decimal.Decimal `json:"gainContribution,omitempty"`
	Period                 string           `json:"period"`
	ComparisonPeriod       string           `json:"comparisonPeriod,omitempty"`
	Account                string           `json:"account,omitempty"`
	RelatedAccounts        []string         `json:"relatedAccounts,omitempty"`
	Href                   string           `json:"href,omitempty"`
}

type PeriodSummary struct {
	Start             time.Time
	End               time.Time
	AsOf              time.Time
	IsPartial         bool
	Income            decimal.Decimal
	Tax               decimal.Decimal
	Expenses          decimal.Decimal
	Investment        decimal.Decimal
	SavingsRate       decimal.Decimal
	ExpenseByCategory map[string]decimal.Decimal
	NetworthStart     Networth
	NetworthEnd       Networth
}

type InsightContext struct {
	Period           string
	ComparisonPeriod string
	AsOf             time.Time
	IsPartial        bool
	Current          PeriodSummary
	Comparison       PeriodSummary
	Budget           BudgetResult
	Recurring        []TransactionSequence
	Allocation       AllocationSummary
	CheckingBalance  decimal.Decimal
}

type InsightsResult struct {
	Period           string    `json:"period"`
	ComparisonPeriod string    `json:"comparisonPeriod"`
	AsOf             time.Time `json:"asOf"`
	IsPartial        bool      `json:"isPartial"`
	Insights         []Insight `json:"insights"`
}

func GetInsights(db *gorm.DB, periodStr string) (InsightsResult, error) {
	ctx, err := BuildInsightContext(db, periodStr)
	if err != nil {
		return InsightsResult{}, err
	}
	insights := DetectAndRankInsights(ctx)
	return InsightsResult{
		Period:           ctx.Period,
		ComparisonPeriod: ctx.ComparisonPeriod,
		AsOf:             ctx.AsOf,
		IsPartial:        ctx.IsPartial,
		Insights:         insights,
	}, nil
}

func BuildInsightContext(db *gorm.DB, periodStr string) (InsightContext, error) {
	now := utils.Now()
	if periodStr == "" {
		periodStr = now.Format("2006-01")
	}

	targetMonth, err := time.ParseInLocation("2006-01", periodStr, config.TimeZone())
	if err != nil {
		return InsightContext{}, errors.New("invalid period format, expected YYYY-MM")
	}

	currentMonthStr := now.Format("2006-01")
	isCurrentMonth := periodStr == currentMonthStr

	var currentStart, currentEnd, asOf time.Time
	var isPartial bool
	var compStart, compEnd time.Time

	comparisonMonth := targetMonth.AddDate(0, -1, 0)
	comparisonPeriodStr := comparisonMonth.Format("2006-01")

	if isCurrentMonth {
		isPartial = true
		asOf = now
		currentStart = utils.BeginningOfMonth(now)
		currentEnd = utils.EndOfToday()

		compStart = utils.BeginningOfMonth(comparisonMonth)
		dayOfMonth := now.Day()
		daysInCompMonth := utils.EndOfMonth(comparisonMonth).Day()
		if dayOfMonth > daysInCompMonth {
			dayOfMonth = daysInCompMonth
		}
		compEnd = time.Date(comparisonMonth.Year(), comparisonMonth.Month(), dayOfMonth, 23, 59, 59, 999999999, config.TimeZone())
	} else {
		isPartial = false
		currentStart = utils.BeginningOfMonth(targetMonth)
		currentEnd = utils.EndOfMonth(targetMonth)
		asOf = currentEnd

		compStart = utils.BeginningOfMonth(comparisonMonth)
		compEnd = utils.EndOfMonth(comparisonMonth)
	}

	currentSummary := buildPeriodSummary(db, currentStart, currentEnd, asOf, isPartial)
	compSummary := buildPeriodSummary(db, compStart, compEnd, compEnd, isPartial)

	budgetRes := GetBudget(db)
	recurring := GetRecurringTransactions(db)
	allocation := GetAllocationSummary(db)
	checkingBalance := accounting.CostSum(query.Init(db).AccountPrefix("Assets:Checking").All())

	return InsightContext{
		Period:           periodStr,
		ComparisonPeriod: comparisonPeriodStr,
		AsOf:             asOf,
		IsPartial:        isPartial,
		Current:          currentSummary,
		Comparison:       compSummary,
		Budget:           budgetRes,
		Recurring:        recurring,
		Allocation:       allocation,
		CheckingBalance:  checkingBalance,
	}, nil
}

func buildPeriodSummary(db *gorm.DB, start, end, asOf time.Time, isPartial bool) PeriodSummary {
	endInclusive := end.Add(time.Nanosecond)

	expenses := query.Init(db).Like("Expenses:%").NotAccountPrefix("Expenses:Tax").Between(start, endInclusive).All()
	allExpenses := query.Init(db).Like("Expenses:%").Between(start, endInclusive).All()
	incomes := query.Init(db).Like("Income:%").Between(start, endInclusive).All()
	assets := query.Init(db).Like("Assets:%").NotAccountPrefix("Assets:Checking").
		Where("transaction_id not in (select transaction_id from postings p where p.account like ? and p.transaction_id = transaction_id)", "Liabilities:%").
		Between(start, endInclusive).All()

	savingsSummary := ComputeSavingsSummary(assets, allExpenses, incomes, start, end)

	expenseByCategory := make(map[string]decimal.Decimal)
	for i := range expenses {
		p := &expenses[i]
		parts := strings.Split(p.Account, ":")
		var topCategory string
		if len(parts) >= 2 {
			topCategory = parts[0] + ":" + parts[1]
		} else {
			topCategory = p.Account
		}
		expenseByCategory[topCategory] = expenseByCategory[topCategory].Add(p.Amount)
	}

	allNetworthPostings := query.Init(db).Like("Assets:%", "Income:CapitalGains:%", "Liabilities:%").Before(endInclusive).All()
	allNetworthPostings = PopulateMarketPrice(db, allNetworthPostings)

	// Baseline is the previous month-end snapshot (start minus 1 nanosecond)
	// so that any transaction on the 1st of the current month is counted in the month's net worth change.
	networthBaselineDate := start.Add(-time.Nanosecond)
	networthStart := ComputeNetworthOn(db, allNetworthPostings, networthBaselineDate)
	networthEnd := ComputeNetworthOn(db, allNetworthPostings, end)

	return PeriodSummary{
		Start:             start,
		End:               end,
		AsOf:              asOf,
		IsPartial:         isPartial,
		Income:            savingsSummary.NetIncome,
		Tax:               savingsSummary.NetTax,
		Expenses:          savingsSummary.NetExpense,
		Investment:        savingsSummary.NetInvestment,
		SavingsRate:       savingsSummary.SavingsRate,
		ExpenseByCategory: expenseByCategory,
		NetworthStart:     networthStart,
		NetworthEnd:       networthEnd,
	}
}

func DetectAndRankInsights(ctx InsightContext) []Insight {
	candidates := make([]Insight, 0)

	if insight := detectExpenseChange(ctx); insight != nil {
		candidates = append(candidates, *insight)
	}

	candidates = append(candidates, detectCategorySpikes(ctx)...)

	if insight := detectSavingsRateChange(ctx); insight != nil {
		candidates = append(candidates, *insight)
	}

	nwInsight, contribInsight := detectNetworthChange(ctx)
	if nwInsight != nil {
		candidates = append(candidates, *nwInsight)
	}
	if contribInsight != nil {
		candidates = append(candidates, *contribInsight)
	}

	candidates = append(candidates, detectBudgetRisk(ctx)...)
	candidates = append(candidates, detectRecurringIncrease(ctx)...)

	// Only evaluate today-dependent balance/allocation detectors for the active/current period
	if ctx.IsPartial {
		candidates = append(candidates, detectAllocationConcentration(ctx)...)
		candidates = append(candidates, detectCashWarnings(ctx)...)
	}

	return rankAndDeduplicate(candidates)
}

func detectExpenseChange(ctx InsightContext) *Insight {
	curr := ctx.Current.Expenses
	prev := ctx.Comparison.Expenses

	if curr.IsZero() && prev.IsZero() {
		return nil
	}

	if prev.IsZero() && curr.IsPositive() {
		diff := curr
		return &Insight{
			ID:               fmt.Sprintf("expense_change:%s", ctx.Period),
			Type:             InsightTypeExpenseChange,
			Category:         InsightCategorySpending,
			Severity:         InsightSeverityInfo,
			Score:            45,
			Value:            &curr,
			Change:           &diff,
			Period:           ctx.Period,
			ComparisonPeriod: ctx.ComparisonPeriod,
			Href:             hrefExpenseMonthly,
		}
	}

	if prev.IsPositive() {
		diff := curr.Sub(prev)
		percent := diff.Div(prev).Mul(decimal.NewFromInt(100))

		if percent.Abs().GreaterThanOrEqual(decimal.NewFromInt(10)) {
			var severity InsightSeverity
			var score int

			if diff.IsPositive() {
				if percent.GreaterThanOrEqual(decimal.NewFromInt(20)) {
					severity = InsightSeverityWarning
				} else {
					severity = InsightSeverityInfo
				}
				score = 50 + int(percent.IntPart())
				if score > 75 {
					score = 75
				}
			} else {
				severity = InsightSeverityPositive
				score = 35 + int(percent.Abs().IntPart()/2)
				if score > 55 {
					score = 55
				}
			}

			return &Insight{
				ID:               fmt.Sprintf("expense_change:%s", ctx.Period),
				Type:             InsightTypeExpenseChange,
				Category:         InsightCategorySpending,
				Severity:         severity,
				Score:            score,
				Value:            &curr,
				PreviousValue:    &prev,
				Change:           &diff,
				ChangePercent:    &percent,
				Period:           ctx.Period,
				ComparisonPeriod: ctx.ComparisonPeriod,
				Href:             hrefExpenseMonthly,
			}
		}
	}

	return nil
}

func detectCategorySpikes(ctx InsightContext) []Insight {
	spikes := make([]Insight, 0)

	for cat, currCat := range ctx.Current.ExpenseByCategory {
		if strings.HasPrefix(cat, "Expenses:Tax") {
			continue
		}
		if currCat.LessThanOrEqual(decimal.Zero) {
			continue
		}

		prevCat := ctx.Comparison.ExpenseByCategory[cat]
		diff := currCat.Sub(prevCat)

		if prevCat.IsPositive() {
			percent := diff.Div(prevCat).Mul(decimal.NewFromInt(100))
			// Relative materiality: category diff must be >= 2% of total monthly spend
			isRelativeMaterial := false
			var share decimal.Decimal
			if ctx.Current.Expenses.IsPositive() {
				share = diff.Div(ctx.Current.Expenses)
				if share.GreaterThanOrEqual(decimal.NewFromFloat(0.02)) {
					isRelativeMaterial = true
				}
			}

			if percent.GreaterThanOrEqual(decimal.NewFromInt(20)) && isRelativeMaterial {
				severity := InsightSeverityInfo
				if percent.GreaterThanOrEqual(decimal.NewFromInt(40)) && share.GreaterThanOrEqual(decimal.NewFromFloat(0.05)) {
					severity = InsightSeverityWarning
				}
				score := 55 + int(percent.IntPart()/2)
				if score > 75 {
					score = 75
				}

				spikes = append(spikes, Insight{
					ID:               fmt.Sprintf("category_spike:%s:%s", ctx.Period, cat),
					Type:             InsightTypeCategorySpike,
					Category:         InsightCategorySpending,
					Severity:         severity,
					Score:            score,
					Value:            &currCat,
					PreviousValue:    &prevCat,
					Change:           &diff,
					ChangePercent:    &percent,
					Account:          cat,
					Period:           ctx.Period,
					ComparisonPeriod: ctx.ComparisonPeriod,
					Href:             hrefExpenseMonthly,
				})
			}
		} else if prevCat.IsZero() && ctx.Current.Expenses.IsPositive() {
			if currCat.Div(ctx.Current.Expenses).GreaterThanOrEqual(decimal.NewFromFloat(0.05)) {
				spikes = append(spikes, Insight{
					ID:               fmt.Sprintf("category_spike:%s:%s", ctx.Period, cat),
					Type:             InsightTypeCategorySpike,
					Category:         InsightCategorySpending,
					Severity:         InsightSeverityInfo,
					Score:            50,
					Value:            &currCat,
					Change:           &diff,
					Account:          cat,
					Period:           ctx.Period,
					ComparisonPeriod: ctx.ComparisonPeriod,
					Href:             hrefExpenseMonthly,
				})
			}
		}
	}

	sort.Slice(spikes, func(i, j int) bool {
		if spikes[i].Score != spikes[j].Score {
			return spikes[i].Score > spikes[j].Score
		}
		return spikes[i].ID < spikes[j].ID
	})

	if len(spikes) > 3 {
		spikes = spikes[:3]
	}
	return spikes
}

func detectSavingsRateChange(ctx InsightContext) *Insight {
	currRate := ctx.Current.SavingsRate
	prevRate := ctx.Comparison.SavingsRate

	if ctx.Current.Income.LessThanOrEqual(decimal.Zero) || ctx.Comparison.Income.LessThanOrEqual(decimal.Zero) {
		return nil
	}

	diff := currRate.Sub(prevRate)
	if diff.Abs().GreaterThanOrEqual(decimal.NewFromInt(5)) {
		var severity InsightSeverity
		var score int

		if diff.IsNegative() {
			// If previous savings rate was abnormal (>100% from lump-sum), don't trigger warning alarm
			switch {
			case prevRate.GreaterThan(decimal.NewFromInt(100)):
				severity = InsightSeverityInfo
				score = 45
			case diff.Abs().GreaterThanOrEqual(decimal.NewFromInt(15)):
				severity = InsightSeverityWarning
				score = 65 + int(diff.Abs().IntPart()/2)
			default:
				severity = InsightSeverityInfo
				score = 50
			}
			if score > 80 {
				score = 80
			}
		} else {
			severity = InsightSeverityPositive
			score = 45 + int(diff.IntPart()/2)
			if score > 65 {
				score = 65
			}
		}

		return &Insight{
			ID:               fmt.Sprintf("savings_rate_change:%s", ctx.Period),
			Type:             InsightTypeSavingsRateChange,
			Category:         InsightCategorySavings,
			Severity:         severity,
			Score:            score,
			Value:            &currRate,
			PreviousValue:    &prevRate,
			Change:           &diff,
			Period:           ctx.Period,
			ComparisonPeriod: ctx.ComparisonPeriod,
			Href:             "/assets/investment",
		}
	}

	return nil
}

func detectNetworthChange(ctx InsightContext) (*Insight, *Insight) {
	currBalance := ctx.Current.NetworthEnd.BalanceAmount
	prevBalance := ctx.Current.NetworthStart.BalanceAmount

	if prevBalance.IsZero() && currBalance.IsZero() {
		return nil, nil
	}

	change := currBalance.Sub(prevBalance)
	changePercent := decimal.Zero

	isMaterial := false
	if prevBalance.IsPositive() {
		changePercent = change.Div(prevBalance).Mul(decimal.NewFromInt(100))
		if changePercent.Abs().GreaterThanOrEqual(decimal.NewFromInt(1)) {
			isMaterial = true
		}
	} else if !currBalance.IsZero() {
		isMaterial = true
	}

	if !isMaterial {
		return nil, nil
	}

	severity := InsightSeverityPositive
	score := 45
	if change.IsNegative() {
		// Minor dips (< 5%) are info/normal, significant drops (>= 5%) are warnings
		if changePercent.Abs().GreaterThanOrEqual(decimal.NewFromInt(5)) {
			severity = InsightSeverityWarning
			score = 60
		} else {
			severity = InsightSeverityInfo
			score = 40
		}
	}

	nwInsight := &Insight{
		ID:               fmt.Sprintf("networth_change:%s", ctx.Period),
		Type:             InsightTypeNetworthChange,
		Category:         InsightCategoryNetworth,
		Severity:         severity,
		Score:            score,
		Value:            &currBalance,
		PreviousValue:    &prevBalance,
		Change:           &change,
		ChangePercent:    &changePercent,
		Period:           ctx.Period,
		ComparisonPeriod: ctx.ComparisonPeriod,
		Href:             "/assets/networth",
	}

	invContrib := ctx.Current.NetworthEnd.NetInvestmentAmount.Sub(ctx.Current.NetworthStart.NetInvestmentAmount)
	gainContrib := ctx.Current.NetworthEnd.GainAmount.Sub(ctx.Current.NetworthStart.GainAmount)

	var contribInsight *Insight
	if !invContrib.IsZero() || !gainContrib.IsZero() {
		contribSeverity := InsightSeverityInfo
		if change.IsPositive() {
			contribSeverity = InsightSeverityPositive
		}
		contribInsight = &Insight{
			ID:                     fmt.Sprintf("networth_contribution:%s", ctx.Period),
			Type:                   InsightTypeNetworthContribution,
			Category:               InsightCategoryInvestment,
			Severity:               contribSeverity,
			Score:                  40,
			Value:                  &currBalance,
			Change:                 &change,
			InvestmentContribution: &invContrib,
			GainContribution:       &gainContrib,
			Period:                 ctx.Period,
			ComparisonPeriod:       ctx.ComparisonPeriod,
			Href:                   "/assets/networth",
		}
	}

	return nwInsight, contribInsight
}

func detectBudgetRisk(ctx InsightContext) []Insight {
	insights := make([]Insight, 0)
	budget, ok := ctx.Budget.BudgetsByMonth[ctx.Period]
	if !ok || len(budget.Accounts) == 0 {
		return insights
	}

	for i := range budget.Accounts {
		acc := &budget.Accounts[i]
		isOverspent := acc.Available.IsNegative() || (acc.Forecast.IsPositive() && acc.Actual.GreaterThan(acc.Forecast))

		if isOverspent {
			overAmount := acc.Actual.Sub(acc.Forecast)
			if acc.Available.IsNegative() && acc.Available.Abs().GreaterThan(overAmount) {
				overAmount = acc.Available.Abs()
			}
			if overAmount.LessThanOrEqual(decimal.Zero) {
				continue
			}
			actual := acc.Actual
			forecast := acc.Forecast
			insights = append(insights, Insight{
				ID:            fmt.Sprintf("budget_overspent:%s:%s", ctx.Period, acc.Account),
				Type:          InsightTypeBudgetOverspent,
				Category:      InsightCategoryBudget,
				Severity:      InsightSeverityCritical,
				Score:         85,
				Value:         &actual,
				PreviousValue: &forecast,
				Change:        &overAmount,
				Account:       acc.Account,
				Period:        ctx.Period,
				Href:          hrefExpenseBudget,
			})
		} else if acc.Forecast.IsPositive() && ctx.IsPartial {
			// Only flag pacing risk for in-progress months if usage is high (>85%)
			usagePercent := acc.Actual.Div(acc.Forecast).Mul(decimal.NewFromInt(100))
			if usagePercent.GreaterThanOrEqual(decimal.NewFromInt(85)) && acc.Actual.LessThan(acc.Forecast) {
				actual := acc.Actual
				forecast := acc.Forecast
				remaining := acc.Forecast.Sub(acc.Actual)
				insights = append(insights, Insight{
					ID:            fmt.Sprintf("budget_risk:%s:%s", ctx.Period, acc.Account),
					Type:          InsightTypeBudgetRisk,
					Category:      InsightCategoryBudget,
					Severity:      InsightSeverityWarning,
					Score:         48,
					Value:         &actual,
					PreviousValue: &forecast,
					Change:        &remaining,
					ChangePercent: &usagePercent,
					Account:       acc.Account,
					Period:        ctx.Period,
					Href:          hrefExpenseBudget,
				})
			}
		}
	}

	return insights
}

func detectRecurringIncrease(ctx InsightContext) []Insight {
	insights := make([]Insight, 0)

	for _, seq := range ctx.Recurring {
		if len(seq.Transactions) < 2 {
			continue
		}

		// Find transaction occurring in ctx.Period and compare against its immediate predecessor
		var currentTx *transaction.Transaction
		var prevTx *transaction.Transaction
		for i := range seq.Transactions {
			tx := &seq.Transactions[i]
			txPeriod := tx.Date.Format("2006-01")
			if currentTx == nil && txPeriod == ctx.Period {
				currentTx = tx
			} else if currentTx != nil {
				prevTx = tx
				break
			}
		}

		if currentTx == nil || prevTx == nil {
			continue
		}

		latestExpense := expenseOutflow(*currentTx)
		prevExpense := expenseOutflow(*prevTx)

		if latestExpense.GreaterThan(prevExpense) && prevExpense.IsPositive() {
			diff := latestExpense.Sub(prevExpense)
			percent := diff.Div(prevExpense).Mul(decimal.NewFromInt(100))

			if percent.GreaterThanOrEqual(decimal.NewFromInt(5)) {
				insights = append(insights, Insight{
					ID:            fmt.Sprintf("recurring_increase:%s:%s", ctx.Period, seq.Key),
					Type:          InsightTypeRecurringIncrease,
					Category:      InsightCategoryRecurring,
					Severity:      InsightSeverityWarning,
					Score:         60,
					Value:         &latestExpense,
					PreviousValue: &prevExpense,
					Change:        &diff,
					ChangePercent: &percent,
					Account:       seq.Key,
					Period:        ctx.Period,
					Href:          "/cash_flow/recurring",
				})
			}
		}
	}

	return insights
}

func expenseOutflow(t transaction.Transaction) decimal.Decimal {
	expenseSum := decimal.Zero
	for i := range t.Postings {
		p := &t.Postings[i]
		if strings.HasPrefix(p.Account, "Expenses:") && p.Amount.IsPositive() {
			expenseSum = expenseSum.Add(p.Amount)
		}
	}
	return expenseSum
}

func detectAllocationConcentration(ctx InsightContext) []Insight {
	insights := make([]Insight, 0)

	if len(ctx.Allocation.Targets) > 0 {
		for _, target := range ctx.Allocation.Targets {
			deviation := target.Current.Sub(target.Target)
			if deviation.GreaterThanOrEqual(decimal.NewFromInt(10)) {
				current := target.Current
				targetVal := target.Target
				insights = append(insights, Insight{
					ID:            fmt.Sprintf("allocation_concentration:%s", target.Name),
					Type:          InsightTypeAllocationConcentration,
					Category:      InsightCategoryInvestment,
					Severity:      InsightSeverityWarning,
					Score:         50,
					Value:         &current,
					PreviousValue: &targetVal,
					Change:        &deviation,
					Account:       target.Name,
					Period:        ctx.Period,
					Href:          "/assets/allocation",
				})
			}
		}
	} else if ctx.Allocation.TotalMarketAmount.IsPositive() {
		for acc, amount := range ctx.Allocation.ByTopLevel {
			percent := amount.Div(ctx.Allocation.TotalMarketAmount).Mul(decimal.NewFromInt(100))
			if percent.GreaterThanOrEqual(decimal.NewFromInt(60)) {
				insights = append(insights, Insight{
					ID:            fmt.Sprintf("allocation_concentration:%s", acc),
					Type:          InsightTypeAllocationConcentration,
					Category:      InsightCategoryInvestment,
					Severity:      InsightSeverityInfo,
					Score:         40,
					Value:         &amount,
					ChangePercent: &percent,
					Account:       acc,
					Period:        ctx.Period,
					Href:          "/assets/allocation",
				})
			}
		}
	}

	return insights
}

func detectCashWarnings(ctx InsightContext) []Insight {
	insights := make([]Insight, 0)

	if ctx.CheckingBalance.IsNegative() {
		bal := ctx.CheckingBalance
		insights = append(insights, Insight{
			ID:       "cash_warning:negative_checking",
			Type:     InsightTypeCashWarning,
			Category: InsightCategoryCash,
			Severity: InsightSeverityCritical,
			Score:    100,
			Value:    &bal,
			Period:   ctx.Period,
			Href:     "/assets/balance",
		})
	}

	if budget, ok := ctx.Budget.BudgetsByMonth[ctx.Period]; ok {
		if budget.EndOfMonthBalance.IsNegative() {
			eom := budget.EndOfMonthBalance
			insights = append(insights, Insight{
				ID:       fmt.Sprintf("cash_warning:budget_deficit:%s", ctx.Period),
				Type:     InsightTypeCashWarning,
				Category: InsightCategoryCash,
				Severity: InsightSeverityWarning,
				Score:    90,
				Value:    &eom,
				Period:   ctx.Period,
				Href:     hrefExpenseBudget,
			})
		}
	}

	return insights
}

func rankAndDeduplicate(insights []Insight) []Insight {
	seenAccounts := make(map[string]bool)
	filtered := make([]Insight, 0, len(insights))

	for i := range insights {
		ins := &insights[i]
		if ins.Type == InsightTypeBudgetOverspent {
			seenAccounts[ins.Account] = true
			filtered = append(filtered, *ins)
		}
	}

	for i := range insights {
		ins := &insights[i]
		if ins.Type == InsightTypeBudgetRisk {
			if seenAccounts[ins.Account] {
				continue
			}
			filtered = append(filtered, *ins)
		} else if ins.Type != InsightTypeBudgetOverspent {
			filtered = append(filtered, *ins)
		}
	}

	sort.SliceStable(filtered, func(i, j int) bool {
		if filtered[i].Score != filtered[j].Score {
			return filtered[i].Score > filtered[j].Score
		}
		return filtered[i].ID < filtered[j].ID
	})

	return filtered
}
