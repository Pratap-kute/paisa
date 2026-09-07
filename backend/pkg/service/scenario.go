package service

import (
	"math"
	"sort"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	scenarioComplete    = "complete"
	scenarioUnavailable = "unavailable"
)

// ScenarioError is safe to serialize; internal errors are never exposed.
type ScenarioError struct {
	Code  string
	Month string
}

func (e *ScenarioError) Error() string { return e.Code }
func scenarioError(code string) error  { return &ScenarioError{Code: code} }

func scenarioMedian(samples []decimal.Decimal, magnitude bool) ScenarioAssumption {
	a := ScenarioAssumption{Source: "insufficient_data", SampleCount: len(samples)}
	if len(samples) == 0 {
		return a
	}
	sort.Slice(samples, func(i, j int) bool { return samples[i].LessThan(samples[j]) })
	value := samples[len(samples)/2]
	if len(samples)%2 == 0 {
		value = value.Add(samples[len(samples)/2-1]).Div(decimal.NewFromInt(2))
	}
	if magnitude && value.IsNegative() {
		a.Source = "invalid_historical_magnitude"
		return a
	}
	a.Value = &value
	a.Source = "historical_median"
	return a
}

// BuildScenarioBaseline captures historical data once; projection never queries it.
func BuildScenarioBaseline(db *gorm.DB, asOf time.Time, horizon int) (ScenarioBaseline, error) {
	asOf = asOf.In(config.TimeZone())
	b := ScenarioBaseline{AsOfDate: asOf.Format("2006-01-02"), StartDate: utils.BeginningOfMonth(asOf).AddDate(0, 1, 0).Format("2006-01-02"), Currency: config.DefaultCurrency(), HorizonMonths: horizon, Quality: ScenarioQuality{Status: scenarioComplete, Reasons: []ScenarioReason{}}}
	if horizon < 1 || horizon > 120 {
		return b, scenarioError("invalid_scenario_horizon")
	}
	// Query explicitly so database failures propagate instead of looking like empty history.
	var posts []posting.Posting
	dayEnd := time.Date(asOf.Year(), asOf.Month(), asOf.Day()+1, 0, 0, 0, 0, asOf.Location())
	if err := db.Where("date < ? AND forecast = ?", dayEnd, false).Order("date ASC").Find(&posts).Error; err != nil {
		return b, err
	}
	cashPosts := []posting.Posting{}
	investments := []posting.Posting{}
	netPosts := []posting.Posting{}
	incomePosts := []posting.Posting{}
	expensePosts := []posting.Posting{}
	for i := range posts {
		p := &posts[i]
		p.Date = p.Date.In(config.TimeZone())
		if utils.IsSameOrParent(p.Account, "Assets:Checking") {
			cashPosts = append(cashPosts, *p)
		}
		if investmentAccount(p.Account) || IsCapitalGains(*p) {
			investments = append(investments, *p)
		}
		if utils.IsParent(p.Account, "Assets") || utils.IsParent(p.Account, "Liabilities") || IsCapitalGains(*p) {
			netPosts = append(netPosts, *p)
		}
		if scenarioOperationalIncome(p.Account) {
			incomePosts = append(incomePosts, *p)
		}
		if utils.IsParent(p.Account, "Expenses") {
			expensePosts = append(expensePosts, *p)
		}
	}
	addReason := func(code, field string) {
		b.Quality.Reasons = append(b.Quality.Reasons, ScenarioReason{Code: code, Field: field})
		if code != "no_investment_activity" && b.Quality.Status == scenarioComplete {
			b.Quality.Status = "partial"
		}
	}
	if len(cashPosts) > 0 {
		v := accounting.CostSum(cashPosts)
		b.CurrentCash = &v
	} else {
		addReason("no_checking_account", "currentCash")
	}
	events := classifyInvestmentEvents(investments, posts)
	value, quality, _ := performanceValuation(db, events, dayEnd.Add(-time.Nanosecond))
	b.CurrentInvestmentValue = value.BalanceAmount
	if len(investments) == 0 {
		addReason("no_investment_activity", "currentInvestmentValue")
	}
	for _, reason := range quality.Reasons {
		addReason("estimated_investment_value", reason.Commodity)
	}
	// This is the shared current-net-worth valuation path, at the captured date.
	b.CurrentNetWorth = computeEventNetworth(db, classifyInvestmentEvents(netPosts, posts), dayEnd.Add(-time.Nanosecond)).BalanceAmount
	if b.CurrentCash != nil {
		v := b.CurrentNetWorth.Sub(*b.CurrentCash).Sub(b.CurrentInvestmentValue)
		b.StaticNetWorthComponent = &v
	}
	b.MonthlyIncome = scenarioHistorical(incomePosts, utils.BeginningOfMonth(asOf), true)
	b.MonthlyExpenses = scenarioHistorical(expensePosts, utils.BeginningOfMonth(asOf), false)
	// Share corrected contribution classification; retain observed zero months.
	accounts := []string{}
	seen := map[string]bool{}
	for i := range investments {
		p := &investments[i]
		if investmentAccount(p.Account) && !seen[p.Account] {
			accounts = append(accounts, p.Account)
			seen[p.Account] = true
		}
	}
	contributions := monthlyContributions(investments, accounts, asOf, func(window []posting.Posting) []investmentEvent {
		return classifyInvestmentEvents(window, posts)
	})
	samples := []decimal.Decimal{}
	for _, c := range contributions {
		samples = append(samples, c.Amount)
	}
	b.MonthlyInvestmentTransfer = scenarioMedian(samples, false)
	// An explicit first-time-investor assumption, not invented income/expense history.
	if len(investments) == 0 {
		zero := decimal.Zero
		b.MonthlyInvestmentTransfer = ScenarioAssumption{Value: &zero, Source: "no_investment_activity", SampleCount: 0}
	}
	for _, f := range []struct {
		name string
		a    ScenarioAssumption
	}{{"income", b.MonthlyIncome}, {"expense", b.MonthlyExpenses}, {"contribution", b.MonthlyInvestmentTransfer}} {
		if f.a.SampleCount < 6 && f.a.Source != "no_investment_activity" {
			addReason("insufficient_"+f.name+"_history", f.name)
		}
		if f.a.Source == "invalid_historical_magnitude" {
			addReason(f.a.Source, f.name)
		}
	}
	if b.CurrentCash == nil || b.MonthlyIncome.Value == nil || b.MonthlyExpenses.Value == nil || b.MonthlyInvestmentTransfer.Value == nil {
		b.Quality.Status = scenarioUnavailable
	}
	return b, nil
}

func scenarioRate(rate decimal.Decimal) (decimal.Decimal, error) {
	if rate.LessThanOrEqual(decimal.NewFromInt(-1)) {
		return decimal.Zero, scenarioError("invalid_scenario_return")
	}
	f, _ := rate.Float64()
	r := math.Pow(1+f, 1.0/12) - 1
	if math.IsNaN(r) || math.IsInf(r, 0) {
		return decimal.Zero, scenarioError("invalid_scenario_return")
	}
	return decimal.NewFromFloat(r), nil
}

func validateScenario(b ScenarioBaseline, r ScenarioRequest) error {
	if r.HorizonMonths < 1 || r.HorizonMonths > 120 {
		return scenarioError("invalid_scenario_horizon")
	}
	for _, v := range []*decimal.Decimal{r.MonthlyIncome, r.MonthlyExpenses} {
		if v != nil && v.IsNegative() {
			return scenarioError("invalid_scenario")
		}
	}
	for _, v := range []*decimal.Decimal{r.AnnualInvestmentReturn, r.ScenarioAnnualInvestmentReturn} {
		if v != nil {
			if _, err := scenarioRate(*v); err != nil {
				return err
			}
		}
	}
	start, err := time.Parse("2006-01-02", b.StartDate)
	if err != nil {
		return scenarioError("scenario_calculation_failed")
	}
	for _, e := range r.OneTimeEvents {
		m, err := time.Parse("2006-01", e.Month)
		if err != nil || m.Format("2006-01") != e.Month || m.Before(start) || !m.Before(start.AddDate(0, r.HorizonMonths, 0)) || !e.Amount.IsPositive() {
			return scenarioError("invalid_scenario_event")
		}
		switch e.Type {
		case "cash_inflow", "cash_outflow", "cash_to_investment", "investment_to_cash":
		default:
			return scenarioError("invalid_scenario_event")
		}
	}
	return nil
}

// ProjectScenario uses normalized amounts only. Every transfer preserves wealth.
func ProjectScenario(b ScenarioBaseline, r ScenarioRequest) (ScenarioProjection, error) {
	p := ScenarioProjection{Points: []ScenarioPoint{}}
	if err := validateScenario(b, r); err != nil {
		return p, err
	}
	if b.CurrentCash == nil || b.StaticNetWorthComponent == nil || b.MonthlyIncome.Value == nil || b.MonthlyExpenses.Value == nil || b.MonthlyInvestmentTransfer.Value == nil {
		return p, scenarioError("invalid_scenario")
	}
	income, expenses, transfer := *b.MonthlyIncome.Value, *b.MonthlyExpenses.Value, *b.MonthlyInvestmentTransfer.Value
	if r.MonthlyIncome != nil {
		income = *r.MonthlyIncome
	}
	if r.MonthlyExpenses != nil {
		expenses = *r.MonthlyExpenses
	}
	if r.MonthlyInvestmentTransfer != nil {
		transfer = *r.MonthlyInvestmentTransfer
	}
	if income.IsNegative() || expenses.IsNegative() {
		return p, scenarioError("invalid_scenario")
	}
	annual := scenarioAnnualRate(r)
	rate, err := scenarioRate(annual)
	if err != nil {
		return p, err
	}
	cash, investment := *b.CurrentCash, b.CurrentInvestmentValue
	p.OpeningCash = cash
	p.OpeningInvestment = investment
	p.OpeningNetWorth = cash.Add(investment).Add(*b.StaticNetWorthComponent)
	p.MinimumCashBalance = cash
	p.OpeningCashNegative = cash.IsNegative()
	buckets := map[string][]ScenarioEvent{}
	for _, e := range r.OneTimeEvents {
		buckets[e.Month] = append(buckets[e.Month], e)
	}
	start, _ := time.Parse("2006-01-02", b.StartDate)
	p.StartDate = b.StartDate
	for i := 0; i < r.HorizonMonths; i++ {
		month := start.AddDate(0, i, 0)
		key := month.Format("2006-01")
		growth := investment.Mul(rate)
		investment = investment.Add(growth)
		cash = cash.Add(income).Sub(expenses)
		for _, e := range buckets[key] {
			switch e.Type {
			case "cash_inflow":
				cash = cash.Add(e.Amount)
			case "cash_outflow":
				cash = cash.Sub(e.Amount)
			}
		}
		move := func(amount decimal.Decimal) error {
			if amount.IsNegative() && amount.Neg().GreaterThan(investment) {
				return &ScenarioError{Code: "scenario_insufficient_investment_balance", Month: key}
			}
			cash = cash.Sub(amount)
			investment = investment.Add(amount)
			return nil
		}
		if err := move(transfer); err != nil {
			return p, err
		}
		for _, e := range buckets[key] {
			switch e.Type {
			case "cash_to_investment":
				if err := move(e.Amount); err != nil {
					return p, err
				}
			case "investment_to_cash":
				if err := move(e.Amount.Neg()); err != nil {
					return p, err
				}
			}
		}
		net := cash.Add(investment).Add(*b.StaticNetWorthComponent)
		p.Points = append(p.Points, ScenarioPoint{Month: key, Income: income, Expenses: expenses, InvestmentTransfer: transfer, InvestmentGrowth: growth, Cash: cash, Investment: investment, NetWorth: net})
		if cash.LessThan(p.MinimumCashBalance) {
			p.MinimumCashBalance = cash
		}
		if cash.IsNegative() && p.FirstNegativeCashMonth == nil {
			v := key
			p.FirstNegativeCashMonth = &v
		}
		p.TotalIncome = p.TotalIncome.Add(income)
		p.TotalExpenses = p.TotalExpenses.Add(expenses)
		p.TotalInvestmentTransfers = p.TotalInvestmentTransfers.Add(transfer)
		p.TotalInvestmentGrowth = p.TotalInvestmentGrowth.Add(growth)
		p.EndingCash = cash
		p.EndingInvestment = investment
		p.EndingNetWorth = net
		p.EndDate = month.AddDate(0, 1, -1).Format("2006-01-02")
	}
	return p, nil
}

func EvaluateScenario(b ScenarioBaseline, r ScenarioRequest) (ScenarioResult, error) {
	result := ScenarioResult{Snapshot: b, Quality: b.Quality, Assumptions: ScenarioAssumptions{HorizonMonths: r.HorizonMonths}}
	if err := validateScenario(b, r); err != nil {
		return result, err
	}
	if r.AnnualInvestmentReturn != nil {
		result.Assumptions.AnnualInvestmentReturn = *r.AnnualInvestmentReturn
	}
	result.Assumptions.ScenarioAnnualInvestmentReturn = result.Assumptions.AnnualInvestmentReturn
	if r.ScenarioAnnualInvestmentReturn != nil {
		result.Assumptions.ScenarioAnnualInvestmentReturn = *r.ScenarioAnnualInvestmentReturn
	}
	if b.Quality.Status == scenarioUnavailable {
		return result, nil
	}
	baseline, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: r.HorizonMonths, AnnualInvestmentReturn: r.AnnualInvestmentReturn})
	if err != nil {
		return result, err
	}
	scenario, err := ProjectScenario(b, r)
	if err != nil {
		return result, err
	}
	result.Available = true
	result.Baseline = &baseline
	result.Scenario = &scenario
	result.Impact = &ScenarioImpact{EndingCashDelta: scenario.EndingCash.Sub(baseline.EndingCash), EndingInvestmentDelta: scenario.EndingInvestment.Sub(baseline.EndingInvestment), EndingNetWorthDelta: scenario.EndingNetWorth.Sub(baseline.EndingNetWorth), InvestmentGrowthDelta: scenario.TotalInvestmentGrowth.Sub(baseline.TotalInvestmentGrowth), MinimumCashDelta: scenario.MinimumCashBalance.Sub(baseline.MinimumCashBalance)}
	return result, nil
}

func scenarioHistorical(ps []posting.Posting, end time.Time, negate bool) ScenarioAssumption {
	first := end
	sums := map[string]decimal.Decimal{}
	for i := range ps {
		p := &ps[i]
		if !p.Date.Before(end) {
			continue
		}
		if p.Date.Before(first) {
			first = p.Date
		}
		key := p.Date.Format("2006-01")
		sums[key] = sums[key].Add(p.Amount)
	}
	start := end.AddDate(0, -6, 0)
	if first.After(start) {
		start = utils.BeginningOfMonth(first)
	}
	samples := []decimal.Decimal{}
	for m := start; m.Before(end); m = m.AddDate(0, 1, 0) {
		v := sums[m.Format("2006-01")]
		if negate {
			v = v.Neg()
		}
		samples = append(samples, v)
	}
	return scenarioMedian(samples, true)
}

func scenarioAnnualRate(r ScenarioRequest) decimal.Decimal {
	if r.ScenarioAnnualInvestmentReturn != nil {
		return *r.ScenarioAnnualInvestmentReturn
	}
	if r.AnnualInvestmentReturn != nil {
		return *r.AnnualInvestmentReturn
	}
	return decimal.Zero
}

// Investment returns are excluded from operational income to avoid projecting them twice.
func scenarioOperationalIncome(account string) bool {
	return utils.IsParent(account, "Income") && !utils.IsSameOrParent(account, "Income:CapitalGains") && !utils.IsSameOrParent(account, "Income:Dividend") && !utils.IsSameOrParent(account, "Income:Interest")
}
