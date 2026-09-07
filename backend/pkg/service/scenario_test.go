package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func scenarioMoney(n int64) *decimal.Decimal { v := decimal.NewFromInt(n); return &v }
func scenarioFixture() ScenarioBaseline {
	return ScenarioBaseline{StartDate: "2026-10-01", CurrentCash: scenarioMoney(100000), CurrentInvestmentValue: *scenarioMoney(100000), StaticNetWorthComponent: scenarioMoney(0), MonthlyIncome: ScenarioAssumption{Value: scenarioMoney(50000)}, MonthlyExpenses: ScenarioAssumption{Value: scenarioMoney(30000)}, MonthlyInvestmentTransfer: ScenarioAssumption{Value: scenarioMoney(10000)}, Quality: ScenarioQuality{Status: "complete"}}
}
func TestScenarioTransferDoesNotCreateWealth(t *testing.T) {
	b := scenarioFixture()
	r, err := EvaluateScenario(b, ScenarioRequest{HorizonMonths: 1, MonthlyInvestmentTransfer: scenarioMoney(20000)})
	require.NoError(t, err)
	require.True(t, r.Available)
	require.True(t, r.Baseline.EndingCash.Equal(*scenarioMoney(110000)))
	require.True(t, r.Scenario.EndingCash.Equal(*scenarioMoney(100000)))
	require.True(t, r.Scenario.EndingInvestment.Equal(*scenarioMoney(120000)))
	require.True(t, r.Scenario.EndingNetWorth.Equal(*scenarioMoney(220000)))
	require.True(t, r.Impact.EndingNetWorthDelta.IsZero())
}
func TestScenarioEventIdentities(t *testing.T) {
	for _, tc := range []struct {
		kind                  string
		cash, investment, net int64
	}{
		{"cash_inflow", 150000, 200000, 350000}, {"cash_outflow", 50000, 200000, 250000}, {"cash_to_investment", 50000, 250000, 300000}, {"investment_to_cash", 150000, 150000, 300000},
	} {
		t.Run(tc.kind, func(t *testing.T) {
			b := scenarioFixture()
			b.CurrentInvestmentValue = *scenarioMoney(200000)
			r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 1, MonthlyIncome: scenarioMoney(0), MonthlyExpenses: scenarioMoney(0), MonthlyInvestmentTransfer: scenarioMoney(0), OneTimeEvents: []ScenarioEvent{{Month: "2026-10", Type: tc.kind, Amount: *scenarioMoney(50000)}}})
			require.NoError(t, err)
			require.True(t, r.EndingCash.Equal(*scenarioMoney(tc.cash)))
			require.True(t, r.EndingInvestment.Equal(*scenarioMoney(tc.investment)))
			require.True(t, r.EndingNetWorth.Equal(*scenarioMoney(tc.net)))
		})
	}
}
func TestScenarioRecurringWithdrawalAndNegativeStatic(t *testing.T) {
	b := scenarioFixture()
	b.StaticNetWorthComponent = scenarioMoney(-150000)
	r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 1, MonthlyIncome: scenarioMoney(0), MonthlyExpenses: scenarioMoney(0), MonthlyInvestmentTransfer: scenarioMoney(-10000)})
	require.NoError(t, err)
	require.True(t, r.EndingCash.Equal(*scenarioMoney(110000)))
	require.True(t, r.EndingInvestment.Equal(*scenarioMoney(90000)))
	require.True(t, r.EndingNetWorth.Equal(*scenarioMoney(50000)))
}
func TestScenarioGrowthTiming(t *testing.T) {
	for _, rate := range []string{"0", "0.08", "-0.10"} {
		t.Run(rate, func(t *testing.T) {
			b := scenarioFixture()
			v := decimal.RequireFromString(rate)
			r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 12, MonthlyIncome: scenarioMoney(0), MonthlyExpenses: scenarioMoney(0), MonthlyInvestmentTransfer: scenarioMoney(0), AnnualInvestmentReturn: &v})
			require.NoError(t, err)
			expected := b.CurrentInvestmentValue.Mul(decimal.NewFromInt(1).Add(v))
			require.True(t, r.EndingInvestment.Sub(expected).Abs().LessThan(decimal.RequireFromString("0.000001")))
		})
	}
	b := scenarioFixture()
	b.CurrentInvestmentValue = decimal.Zero
	rate := decimal.RequireFromString("0.12")
	r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 1, AnnualInvestmentReturn: &rate})
	require.NoError(t, err)
	require.True(t, r.TotalInvestmentGrowth.IsZero())
	require.True(t, r.EndingInvestment.Equal(*scenarioMoney(10000)))
	r2, err := EvaluateScenario(scenarioFixture(), ScenarioRequest{HorizonMonths: 12, AnnualInvestmentReturn: &rate})
	require.NoError(t, err)
	require.True(t, r2.Impact.EndingNetWorthDelta.IsZero())
	r3, err := EvaluateScenario(scenarioFixture(), ScenarioRequest{HorizonMonths: 12, AnnualInvestmentReturn: &rate, ScenarioAnnualInvestmentReturn: scenarioMoney(0)})
	require.NoError(t, err)
	require.True(t, r3.Impact.EndingNetWorthDelta.IsNegative())
}
func TestScenarioCashAndHorizon(t *testing.T) {
	for _, h := range []int{1, 12, 36, 60, 120} {
		r, err := ProjectScenario(scenarioFixture(), ScenarioRequest{HorizonMonths: h})
		require.NoError(t, err)
		require.Len(t, r.Points, h)
		require.True(t, r.MinimumCashBalance.Equal(*scenarioMoney(100000)))
		for _, p := range r.Points {
			require.True(t, p.NetWorth.Equal(p.Cash.Add(p.Investment)))
		}
	}
	b := scenarioFixture()
	b.CurrentCash = scenarioMoney(-20000)
	r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 3})
	require.NoError(t, err)
	require.True(t, r.MinimumCashBalance.Equal(*scenarioMoney(-20000)))
	require.True(t, r.OpeningCashNegative)
	require.Equal(t, "2026-10", *r.FirstNegativeCashMonth)
	b = scenarioFixture()
	r, err = ProjectScenario(b, ScenarioRequest{HorizonMonths: 3, MonthlyInvestmentTransfer: scenarioMoney(100000)})
	require.NoError(t, err)
	require.Equal(t, "2026-11", *r.FirstNegativeCashMonth)
	require.True(t, r.EndingCash.IsNegative())
	b.StartDate = "2027-12-01"
	r, err = ProjectScenario(b, ScenarioRequest{HorizonMonths: 3})
	require.NoError(t, err)
	require.Equal(t, "2028-02-29", r.EndDate)
}
func TestScenarioValidationAndOrder(t *testing.T) {
	base := ScenarioRequest{HorizonMonths: 1}
	cases := []struct {
		name, code string
		mutate     func(*ScenarioRequest)
	}{
		{"horizon", "invalid_scenario_horizon", func(r *ScenarioRequest) { r.HorizonMonths = 121 }},
		{"negative income", "invalid_scenario", func(r *ScenarioRequest) { r.MonthlyIncome = scenarioMoney(-1) }},
		{"negative expense", "invalid_scenario", func(r *ScenarioRequest) { r.MonthlyExpenses = scenarioMoney(-1) }},
		{"return", "invalid_scenario_return", func(r *ScenarioRequest) { r.AnnualInvestmentReturn = scenarioMoney(-1) }},
		{"lower return", "invalid_scenario_return", func(r *ScenarioRequest) { r.ScenarioAnnualInvestmentReturn = scenarioMoney(-2) }},
		{"withdrawal", "scenario_insufficient_investment_balance", func(r *ScenarioRequest) { r.MonthlyInvestmentTransfer = scenarioMoney(-100001) }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := base
			tc.mutate(&r)
			_, err := ProjectScenario(scenarioFixture(), r)
			require.EqualError(t, err, tc.code)
		})
	}
	for _, event := range []ScenarioEvent{{Month: "bad", Type: "cash_inflow", Amount: *scenarioMoney(1)}, {Month: "2026-9", Type: "cash_inflow", Amount: *scenarioMoney(1)}, {Month: "2026-11", Type: "cash_inflow", Amount: *scenarioMoney(1)}, {Month: "2026-10", Type: "unknown", Amount: *scenarioMoney(1)}, {Month: "2026-10", Type: "cash_inflow", Amount: decimal.Zero}, {Month: "2026-10", Type: "cash_inflow", Amount: *scenarioMoney(-1)}} {
		r := base
		r.OneTimeEvents = []ScenarioEvent{event}
		_, err := ProjectScenario(scenarioFixture(), r)
		require.EqualError(t, err, "invalid_scenario_event")
	}
	r := base
	r.OneTimeEvents = []ScenarioEvent{{Month: "2026-10", Type: "investment_to_cash", Amount: *scenarioMoney(120000)}, {Month: "2026-10", Type: "cash_to_investment", Amount: *scenarioMoney(20000)}}
	_, err := ProjectScenario(scenarioFixture(), r)
	require.EqualError(t, err, "scenario_insufficient_investment_balance")
	r.OneTimeEvents[0], r.OneTimeEvents[1] = r.OneTimeEvents[1], r.OneTimeEvents[0]
	_, err = ProjectScenario(scenarioFixture(), r)
	require.NoError(t, err)
}
func TestScenarioBaselineHistory(t *testing.T) {
	db := serviceTestDB(t)
	asOf := time.Date(2026, 9, 7, 12, 0, 0, 0, time.FixedZone("IST", 19800))
	ps := []posting.Posting{}
	for i := range 6 {
		date := time.Date(2026, time.Month(3+i), 10, 0, 0, 0, 0, asOf.Location())
		month := date.Format("2006-01")
		ps = append(ps, posting.Posting{TransactionID: month + "income", Date: date, Account: "Income:Salary", Commodity: "INR", Amount: *scenarioMoney(-50000)}, posting.Posting{TransactionID: month + "expense", Date: date, Account: "Expenses:Food", Commodity: "INR", Amount: *scenarioMoney(10000)}, posting.Posting{TransactionID: month + "tax", Date: date, Account: "Expenses:Tax", Commodity: "INR", Amount: *scenarioMoney(5000)})
		if i%2 == 0 {
			ps = append(ps, posting.Posting{TransactionID: month + "buy", Date: date, Account: "Assets:Fund", Commodity: "INR", Amount: *scenarioMoney(20000), Quantity: *scenarioMoney(20000)})
		}
	}
	ps = append(ps, posting.Posting{TransactionID: "opening", Date: ps[0].Date, Account: "Assets:Checking:Bank", Commodity: "INR", Amount: *scenarioMoney(100000), Quantity: *scenarioMoney(100000)}, posting.Posting{TransactionID: "debt", Date: ps[0].Date, Account: "Liabilities:Loan", Commodity: "INR", Amount: *scenarioMoney(-150000), Quantity: *scenarioMoney(-150000)})
	forecast := ps[0]
	forecast.ID = 0
	forecast.TransactionID = "forecast"
	forecast.Forecast = true
	forecast.Amount = *scenarioMoney(-999999)
	ps = append(ps, forecast)
	future := ps[0]
	future.ID = 0
	future.TransactionID = "future"
	future.Date = asOf.AddDate(0, 1, 0)
	future.Amount = *scenarioMoney(-999999)
	ps = append(ps, future)
	require.NoError(t, db.Create(&ps).Error)
	b, err := BuildScenarioBaseline(db, asOf, 60)
	require.NoError(t, err)
	require.Equal(t, "2026-10-01", b.StartDate)
	require.Equal(t, "complete", b.Quality.Status)
	require.True(t, b.CurrentCash.Equal(*scenarioMoney(100000)))
	require.True(t, b.CurrentInvestmentValue.Equal(*scenarioMoney(60000)))
	require.True(t, b.StaticNetWorthComponent.Equal(*scenarioMoney(-150000)))
	require.True(t, b.MonthlyIncome.Value.Equal(*scenarioMoney(50000)))
	require.True(t, b.MonthlyExpenses.Value.Equal(*scenarioMoney(15000)))
	require.True(t, b.MonthlyInvestmentTransfer.Value.Equal(*scenarioMoney(10000)))
	require.Equal(t, 6, b.MonthlyInvestmentTransfer.SampleCount)
	queries := 0
	require.NoError(t, db.Callback().Query().Before("gorm:query").Register("scenario_count", func(_ *gorm.DB) { queries++ }))
	_, err = BuildScenarioBaseline(db, asOf, 12)
	require.NoError(t, err)
	short := queries
	queries = 0
	_, err = BuildScenarioBaseline(db, asOf, 120)
	require.NoError(t, err)
	require.Equal(t, short, queries)
	queries = 0
	_, err = EvaluateScenario(b, ScenarioRequest{HorizonMonths: 120})
	require.NoError(t, err)
	require.Zero(t, queries)
}
func TestScenarioUnknownIsNotZero(t *testing.T) {
	db := serviceTestDB(t)
	asOf := time.Date(2026, 9, 7, 0, 0, 0, 0, time.Local)
	b, err := BuildScenarioBaseline(db, asOf, 60)
	require.NoError(t, err)
	require.Nil(t, b.CurrentCash)
	require.Nil(t, b.MonthlyIncome.Value)
	require.Nil(t, b.MonthlyInvestmentTransfer.Value)
	require.True(t, b.CurrentInvestmentValue.IsZero())
	r, err := EvaluateScenario(b, ScenarioRequest{HorizonMonths: 60, MonthlyIncome: scenarioMoney(150000), MonthlyExpenses: scenarioMoney(75000), MonthlyInvestmentTransfer: scenarioMoney(20000)})
	require.NoError(t, err)
	require.False(t, r.Available)
	require.Nil(t, r.Baseline)
	require.Nil(t, r.Scenario)
	require.Nil(t, r.Impact)
	require.Nil(t, scenarioMedian(nil, true).Value)
	require.True(t, scenarioMedian([]decimal.Decimal{decimal.Zero}, true).Value.IsZero())
	require.Nil(t, scenarioMedian([]decimal.Decimal{*scenarioMoney(-5)}, true).Value)
}

func TestScenarioBaselineInvestmentClassification(t *testing.T) {
	db := serviceTestDB(t)
	asOf := time.Date(2026, 9, 7, 0, 0, 0, 0, time.Local)
	ps := []posting.Posting{
		performancePost("buy", "2026-06-01", "Assets:Fund", "STOCK", 10000, 100),
		performancePost("buy", "2026-06-01", "Assets:Checking", "INR", -10000, -10000),
		performancePost("div", "2026-07-01", "Income:Dividend", "INR", -1000, -1000),
		performancePost("div", "2026-07-01", "Assets:Fund", "STOCK", 1000, 10),
		performancePost("transfer", "2026-08-01", "Assets:Fund", "STOCK", -11000, -110),
		performancePost("transfer", "2026-08-01", "Assets:OtherFund", "STOCK", 11000, 110),
		performancePost("salary", "2026-06-01", "Income:Salary", "INR", -50000, -50000),
		performancePost("expense", "2026-06-01", "Expenses:Food", "INR", 5000, 5000),
		performancePost("interest", "2026-07-01", "Income:Interest:Fund", "INR", -500, -500),
		performancePost("interest", "2026-07-01", "Assets:Checking", "INR", 500, 500),
	}
	require.NoError(t, db.Create(&ps).Error)
	b, err := BuildScenarioBaseline(db, asOf, 12)
	require.NoError(t, err)
	require.Equal(t, 3, b.MonthlyIncome.SampleCount)
	require.True(t, b.MonthlyIncome.Value.IsZero())
	require.Equal(t, 3, b.MonthlyInvestmentTransfer.SampleCount)
	require.True(t, b.MonthlyInvestmentTransfer.Value.IsZero())
	require.Equal(t, "partial", b.Quality.Status)
	found := false
	for _, reason := range b.Quality.Reasons {
		if reason.Code == "estimated_investment_value" {
			found = true
		}
	}
	require.True(t, found)
}

func TestScenarioEmptyHoldingsWithObservedTransfers(t *testing.T) {
	db := serviceTestDB(t)
	asOf := time.Date(2026, 9, 7, 0, 0, 0, 0, time.Local)
	ps := []posting.Posting{
		performancePost("buy", "2026-06-01", "Assets:Fund", "INR", 10000, 10000),
		performancePost("sell", "2026-07-01", "Assets:Fund", "INR", -10000, -10000),
		performancePost("cash", "2026-06-01", "Assets:Checking", "INR", 100000, 100000),
		performancePost("salary", "2026-06-01", "Income:Salary", "INR", -50000, -50000),
		performancePost("expense", "2026-06-01", "Expenses:Food", "INR", 10000, 10000),
	}
	require.NoError(t, db.Create(&ps).Error)
	b, err := BuildScenarioBaseline(db, asOf, 12)
	require.NoError(t, err)
	require.True(t, b.CurrentInvestmentValue.IsZero())
	require.True(t, b.MonthlyInvestmentTransfer.Value.IsZero())
	r, err := EvaluateScenario(b, ScenarioRequest{HorizonMonths: 12, MonthlyInvestmentTransfer: scenarioMoney(20000)})
	require.NoError(t, err)
	require.True(t, r.Available)
	require.True(t, r.Scenario.EndingInvestment.Equal(*scenarioMoney(240000)))
}

func TestScenarioOperationSequence(t *testing.T) {
	b := scenarioFixture()
	b.CurrentCash = scenarioMoney(0)
	b.CurrentInvestmentValue = *scenarioMoney(100)
	rate := decimal.RequireFromString("2.138428376721") // 10% monthly, compounded for 12 months.
	r, err := ProjectScenario(b, ScenarioRequest{HorizonMonths: 2, MonthlyIncome: scenarioMoney(10), MonthlyExpenses: scenarioMoney(5), MonthlyInvestmentTransfer: scenarioMoney(20), AnnualInvestmentReturn: &rate, OneTimeEvents: []ScenarioEvent{
		{Month: "2026-10", Type: "cash_inflow", Amount: *scenarioMoney(50)},
		{Month: "2026-10", Type: "cash_outflow", Amount: *scenarioMoney(10)},
		{Month: "2026-10", Type: "investment_to_cash", Amount: *scenarioMoney(130)},
		{Month: "2026-11", Type: "cash_to_investment", Amount: *scenarioMoney(10)},
	}})
	require.NoError(t, err)
	require.True(t, r.Points[0].Investment.Abs().LessThan(decimal.RequireFromString("0.000001")))
	require.True(t, r.Points[0].Cash.Equal(*scenarioMoney(155)))
	require.True(t, r.Points[1].Investment.Sub(*scenarioMoney(30)).Abs().LessThan(decimal.RequireFromString("0.000001")))
}

func TestScenarioConfiguredTimezone(t *testing.T) {
	db := serviceTestDB(t)
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\ntime_zone: Asia/Kolkata\n"), ""))
	// September locally, although the supplied clock is still in August UTC.
	b, err := BuildScenarioBaseline(db, time.Date(2026, 8, 31, 20, 0, 0, 0, time.UTC), 1)
	require.NoError(t, err)
	require.Equal(t, "2026-09-01", b.AsOfDate)
	require.Equal(t, "2026-10-01", b.StartDate)
}

func TestScenarioBaselineQueriesDoNotScaleWithAccounts(t *testing.T) {
	for _, count := range []int{1, 50} {
		t.Run(fmt.Sprint(count), func(t *testing.T) {
			db := serviceTestDB(t)
			ps := make([]posting.Posting, count)
			for i := range ps {
				ps[i] = performancePost(fmt.Sprint(i), "2026-06-01", fmt.Sprintf("Assets:Fund:%d", i), "INR", 1000, 1000)
			}
			require.NoError(t, db.Create(&ps).Error)
			queries := 0
			require.NoError(t, db.Callback().Query().Before("gorm:query").Register("scenario_accounts", func(_ *gorm.DB) { queries++ }))
			_, err := BuildScenarioBaseline(db, time.Date(2026, 9, 7, 0, 0, 0, 0, time.Local), 120)
			require.NoError(t, err)
			require.Equal(t, 1, queries, "currency accounts should be captured by one posting query")
		})
	}
}
