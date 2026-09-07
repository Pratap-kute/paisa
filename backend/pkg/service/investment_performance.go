package service

import (
	"errors"
	"slices"
	"sort"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const performancePartial = "partial"

var ErrPerformanceRange = errors.New("invalid_investment_performance_range")
var ErrPerformanceReconciliation = errors.New("investment_performance_reconciliation_failed")

type PerformanceOptions struct {
	Preset        string
	From          string
	To            string
	AccountPrefix string
	Timeline      bool
	Drivers       bool
}
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
	PeriodReturn            *decimal.Decimal    `json:"periodReturn"`
	SinceInceptionXIRR      *decimal.Decimal    `json:"sinceInceptionXirr"`
	ReturnUnavailableReason *string             `json:"returnUnavailableReason"`
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
	PeriodReturn            *decimal.Decimal   `json:"periodReturn"`
	ReturnUnavailableReason *string            `json:"returnUnavailableReason"`
	Quality                 PerformanceQuality `json:"quality"`
}
type PerformanceCashFlow struct {
	Date   time.Time
	Amount decimal.Decimal
}

func performanceDay(t time.Time) time.Time {
	t = t.In(config.TimeZone())
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, config.TimeZone())
}
func calendarOrdinal(t time.Time) int64 {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC).Unix() / 86400
}
func resolvePerformancePeriod(o PerformanceOptions, first time.Time) (time.Time, time.Time, error) {
	today := performanceDay(utils.Now())
	start, end := today, today
	if o.From != "" || o.To != "" {
		if o.Preset != "" || o.From == "" || o.To == "" {
			return start, end, ErrPerformanceRange
		}
		var err error
		start, err = time.ParseInLocation("2006-01-02", o.From, config.TimeZone())
		if err != nil {
			return start, end, ErrPerformanceRange
		}
		end, err = time.ParseInLocation("2006-01-02", o.To, config.TimeZone())
		if err != nil {
			return start, end, ErrPerformanceRange
		}
	} else {
		switch o.Preset {
		case "", "current_fy":
			start = utils.BeginningOfFinancialYear(today)
		case "previous_fy":
			start = utils.BeginningOfFinancialYear(today).AddDate(-1, 0, 0)
			end = performanceDay(utils.EndOfFinancialYear(start))
		case "one_year":
			day := today.Day()
			if today.Month() == time.February && day == 29 {
				day = 28
			}
			start = time.Date(today.Year()-1, today.Month(), day, 0, 0, 0, 0, config.TimeZone()).AddDate(0, 0, 1)
		case "since_inception":
			if !first.IsZero() {
				start = performanceDay(first)
			}
		default:
			return start, end, ErrPerformanceRange
		}
	}
	if start.After(end) || end.After(today) {
		return start, end, ErrPerformanceRange
	}
	return start, utils.EndOfDay(end), nil
}

// ModifiedDietz uses end-of-day flows and returns a ratio, never percent points.
func ModifiedDietz(opening, investmentReturn decimal.Decimal, flows []PerformanceCashFlow, start, end time.Time) *decimal.Decimal {
	days := calendarOrdinal(end) - calendarOrdinal(start) + 1
	if days <= 0 {
		return nil
	}
	capital, scale := opening, opening.Abs()
	for _, f := range flows {
		remaining := calendarOrdinal(end) - calendarOrdinal(f.Date)
		weight := decimal.NewFromInt(remaining).Div(decimal.NewFromInt(days))
		capital = capital.Add(weight.Mul(f.Amount))
		scale = scale.Add(f.Amount.Abs())
	}
	if capital.LessThanOrEqual(decimal.RequireFromString("0.01")) || capital.LessThanOrEqual(scale.Mul(decimal.RequireFromString("0.00000001"))) {
		return nil
	}
	r := investmentReturn.Div(capital)
	return &r
}
func investmentAccount(account string) bool {
	return utils.IsParent(account, "Assets") && !utils.IsSameOrParent(account, "Assets:Checking")
}
func selectedInvestment(account, prefix string) bool {
	return investmentAccount(account) && (prefix == "" || utils.IsSameOrParent(account, prefix))
}

func performanceValuation(db *gorm.DB, events []investmentEvent, date time.Time) (Networth, PerformanceQuality, []PerformanceQuote) {
	n := computeEventNetworth(db, events, date)
	q := PerformanceQuality{Status: "complete", Reasons: []PerformanceReason{}}
	units := map[string]decimal.Decimal{}
	for i := range events {
		e := &events[i]
		if !e.Posting.Date.After(date) && !utils.IsCurrency(e.Posting.Commodity) {
			units[e.Posting.Commodity] = units[e.Posting.Commodity].Add(e.Units)
		}
	}
	quotes := []PerformanceQuote{}
	for _, commodity := range utils.SortedKeys(units) {
		if units[commodity].IsZero() {
			continue
		}
		p := GetUnitPrice(db, commodity, date)
		source := "market"
		quoteDate := ""
		if !p.Date.IsZero() {
			quoteDate = p.Date.Format("2006-01-02")
		}
		if p.Value.IsZero() {
			source = "cost"
		} else if p.CommodityType == config.Unknown {
			source = "trade"
		}
		quotes = append(quotes, PerformanceQuote{Commodity: commodity, Date: quoteDate, Source: source})
		if source != "market" {
			q.Status = performancePartial
			q.Reasons = append(q.Reasons, PerformanceReason{Code: "valuation_fallback", Commodity: commodity, Date: date.Format("2006-01-02")})
		}
	}
	return n, q, quotes
}

func calculatePerformance(db *gorm.DB, events []investmentEvent, start, end time.Time) (InvestmentPerformance, error) {
	r := InvestmentPerformance{StartDate: start.Format("2006-01-02"), EndDate: end.Format("2006-01-02"), Quality: PerformanceQuality{Status: "complete", Reasons: []PerformanceReason{}}}
	opening, oq, openingQuotes := performanceValuation(db, events, start.Add(-time.Nanosecond))
	closing, cq, closingQuotes := performanceValuation(db, events, end)
	r.OpeningQuotes, r.ClosingQuotes = openingQuotes, closingQuotes
	r.OpeningValue, r.ClosingValue = opening.BalanceAmount, closing.BalanceAmount
	r.Quality.Reasons = append(r.Quality.Reasons, oq.Reasons...)
	r.Quality.Reasons = append(r.Quality.Reasons, cq.Reasons...)
	// Net at the transaction boundary, not by sign of individual postings.
	flowByID := map[string]PerformanceCashFlow{}
	active := false
	for i := range events {
		e := &events[i]
		if e.Posting.Date.After(end) {
			continue
		}
		active = true
		if e.Posting.Date.Before(start) {
			continue
		}
		f := flowByID[e.Posting.TransactionID]
		f.Date = e.Posting.Date
		f.Amount = f.Amount.Add(e.Flow)
		flowByID[e.Posting.TransactionID] = f
	}
	flows := []PerformanceCashFlow{}
	for _, id := range utils.SortedKeys(flowByID) {
		f := flowByID[id]
		if f.Amount.IsZero() {
			continue
		}
		flows = append(flows, f)
		if f.Amount.IsPositive() {
			r.Contributions = r.Contributions.Add(f.Amount)
		} else {
			r.Withdrawals = r.Withdrawals.Sub(f.Amount)
		}
	}
	r.NetContribution = r.Contributions.Sub(r.Withdrawals)
	r.PortfolioChange = r.ClosingValue.Sub(r.OpeningValue)
	r.InvestmentReturn = closing.GainAmount.Sub(opening.GainAmount)
	if !r.OpeningValue.Add(r.NetContribution).Add(r.InvestmentReturn).Equal(r.ClosingValue) {
		return r, ErrPerformanceReconciliation
	}
	r.PeriodReturn = ModifiedDietz(r.OpeningValue, r.InvestmentReturn, flows, start, end)
	if r.PeriodReturn == nil {
		reason := "insufficient_weighted_capital"
		r.ReturnUnavailableReason = &reason
	}
	if len(r.Quality.Reasons) > 0 {
		r.Quality.Status = performancePartial
		suppressPerformanceReturn(&r, "insufficient_valuation_data")
	}
	if !active {
		r.Quality.Status = "unavailable"
		r.Quality.Reasons = append(r.Quality.Reasons, PerformanceReason{Code: "no_investment_activity"})
		suppressPerformanceReturn(&r, "no_investment_activity")
	}
	return r, nil
}
func suppressPerformanceReturn(r *InvestmentPerformance, reason string) {
	r.PeriodReturn = nil
	r.ReturnUnavailableReason = &reason
}

// GetInvestmentPerformance is shared directly by HTTP handlers and Dashboard.
func GetInvestmentPerformance(db *gorm.DB, o PerformanceOptions) (InvestmentPerformance, error) {
	if o.AccountPrefix != "" && o.AccountPrefix != "Assets" && !investmentAccount(o.AccountPrefix) {
		return InvestmentPerformance{}, ErrPerformanceRange
	}
	var all []posting.Posting
	asOf := utils.EndOfDay(performanceDay(utils.Now()))
	// Retain whole relevant transactions, including checking and income counterparts,
	// without loading unrelated expense/salary history.
	ids := db.Model(&posting.Posting{}).Select("transaction_id").Where("forecast = ? AND date <= ?", false, asOf).
		Where("(account LIKE ? AND account != ? AND account NOT LIKE ?) OR account LIKE ? OR account = ? OR account LIKE ? OR account LIKE ?",
			"Assets:%", "Assets:Checking", "Assets:Checking:%", "Income:CapitalGains:%", "Income:Dividend", "Income:Dividend:%", "Income:Interest:%")
	if err := db.Where("forecast = ? AND date <= ? AND transaction_id IN (?)", false, asOf, ids).Order("date asc, id asc").Find(&all).Error; err != nil {
		return InvestmentPerformance{}, err
	}
	ps := []posting.Posting{}
	first := time.Time{}
	for i := range all {
		p := &all[i]
		account := p.Account
		if IsCapitalGains(*p) {
			account = CapitalGainsSourceAccount(account)
		}
		if selectedInvestment(account, o.AccountPrefix) {
			ps = append(ps, *p)
			if first.IsZero() && investmentAccount(p.Account) {
				first = p.Date
			}
		}
	}
	start, end, err := resolvePerformancePeriod(o, first)
	if err != nil {
		return InvestmentPerformance{}, err
	}
	events := classifyInvestmentEvents(ps, all)
	r, err := calculatePerformance(db, events, start, end)
	if err != nil {
		return r, err
	}
	r.Account = o.AccountPrefix
	// Existing lifetime XIRR algorithm and cash-flow semantics are intentionally retained.
	if len(ps) > 0 {
		v := XIRR(db, PopulateMarketPrice(db, ps)).Div(decimal.NewFromInt(100))
		r.SinceInceptionXIRR = &v
	}
	incomeEvidence := collectIncomeEvidence(all, start, end)
	flagUnattributedIncome(&r, incomeEvidence, func(account string) bool { return selectedInvestment(account, o.AccountPrefix) })
	byAccount := map[string][]investmentEvent{}
	for i := range events {
		e := &events[i]
		byAccount[e.Account] = append(byAccount[e.Account], *e)
	}
	total := decimal.Zero
	for _, account := range utils.SortedKeys(byAccount) {
		driver, err := calculatePerformance(db, byAccount[account], start, end)
		if err != nil {
			return r, err
		}
		total = total.Add(driver.InvestmentReturn)
		if o.Drivers {
			flagUnattributedIncome(&driver, incomeEvidence, func(candidate string) bool { return candidate == account })
			r.Drivers = append(r.Drivers, PerformanceDriver{Account: account, OpeningValue: driver.OpeningValue, ClosingValue: driver.ClosingValue, NetContribution: driver.NetContribution, ReturnAmount: driver.InvestmentReturn, PeriodReturn: driver.PeriodReturn, ReturnUnavailableReason: driver.ReturnUnavailableReason, Quality: driver.Quality})
		}
	}
	if !total.Equal(r.InvestmentReturn) {
		return r, ErrPerformanceReconciliation
	}
	sort.SliceStable(r.Drivers, func(i, j int) bool { return r.Drivers[i].ReturnAmount.GreaterThan(r.Drivers[j].ReturnAmount) })
	if o.Timeline {
		boundaries := []time.Time{start.Add(-time.Nanosecond)}
		for date := utils.EndOfMonth(start); date.Before(end); date = utils.EndOfMonth(date.Add(time.Nanosecond)) {
			boundaries = append(boundaries, date)
		}
		boundaries = append(boundaries, end)
		opening := computeEventNetworth(db, events, start.Add(-time.Nanosecond))
		for _, date := range boundaries {
			n, q, quotes := performanceValuation(db, events, date)
			r.Timeline = append(r.Timeline, PerformancePoint{Date: date.Format("2006-01-02"), Value: n.BalanceAmount, ContributionBaseline: r.OpeningValue.Add(n.NetInvestmentAmount.Sub(opening.NetInvestmentAmount)), Quality: q, Quotes: quotes})
		}
	}
	return r, nil
}

// Income evidence is collected once and evaluated against each selected scope.
type performanceIncomeEvidence struct {
	date     string
	accounts []string
}

func collectIncomeEvidence(all []posting.Posting, start, end time.Time) []performanceIncomeEvidence {
	txs := map[string][]posting.Posting{}
	for i := range all {
		p := &all[i]
		if !p.Date.Before(start) && !p.Date.After(end) {
			txs[p.TransactionID] = append(txs[p.TransactionID], *p)
		}
	}
	result := []performanceIncomeEvidence{}
	for _, id := range utils.SortedKeys(txs) {
		income, checking := false, false
		evidence := performanceIncomeEvidence{date: txs[id][0].Date.Format("2006-01-02")}
		for i := range txs[id] {
			p := &txs[id][i]
			if p.Amount.IsZero() {
				continue
			}
			if utils.IsSameOrParent(p.Account, "Income:Dividend") || utils.IsParent(p.Account, "Income:Interest") {
				income = true
			}
			if utils.IsSameOrParent(p.Account, "Assets:Checking") {
				checking = true
			}
			if investmentAccount(p.Account) && !slices.Contains(evidence.accounts, p.Account) {
				evidence.accounts = append(evidence.accounts, p.Account)
			}
		}
		if income && checking {
			result = append(result, evidence)
		}
	}
	return result
}
func flagUnattributedIncome(r *InvestmentPerformance, evidence []performanceIncomeEvidence, selected func(string) bool) {
	if r.Quality.Status == "unavailable" {
		return
	}
	for _, item := range evidence {
		matched := 0
		for _, account := range item.accounts {
			if selected(account) {
				matched++
			}
		}
		switch {
		case len(item.accounts) == 0:
			// globally unattributed
			r.Quality.Status = performancePartial
			r.Quality.Reasons = append(r.Quality.Reasons, PerformanceReason{Code: "unattributed_investment_income", Date: item.date})
			suppressPerformanceReturn(r, "unattributed_investment_income")
		case matched == 0:
			// positively attributed outside this scope
		case matched == len(item.accounts):
			// all evidence contained inside this scope
		default:
			// attribution crosses this scope boundary
			r.Quality.Status = performancePartial
			r.Quality.Reasons = append(r.Quality.Reasons, PerformanceReason{Code: "unattributed_investment_income", Date: item.date})
			suppressPerformanceReturn(r, "unattributed_investment_income")
		}
	}
}
