package service

import (
	"fmt"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func performancePost(id, date, account, commodity string, amount, units int64) posting.Posting {
	d, _ := time.ParseInLocation("2006-01-02", date, config.TimeZone())
	return posting.Posting{TransactionID: id, Date: d, Account: account, Commodity: commodity, Amount: decimal.NewFromInt(amount), Quantity: decimal.NewFromInt(units)}
}
func TestPerformanceAccounting(t *testing.T) {
	for _, tc := range []struct {
		name                                             string
		opening, contribution, withdrawal, gain, closing int64
	}{
		{"growth is not return", 1000000, 350000, 0, 50000, 1400000},
		{"withdrawal with positive return", 500000, 0, 50000, 20000, 470000},
		{"contribution only", 100000, 900000, 0, 0, 1000000},
		{"negative return", 800000, 100000, 0, -40000, 860000},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := serviceTestDB(t)
			utils.SetNow("2026-09-06")
			t.Cleanup(utils.ResetNow)
			ps := []posting.Posting{
				performancePost("open", "2026-03-31", "Assets:Fund", "INR", tc.opening, tc.opening),
				performancePost("add", "2026-04-02", "Assets:Fund", "INR", tc.contribution, tc.contribution),
				performancePost("withdraw", "2026-05-01", "Assets:Fund", "INR", -tc.withdrawal, -tc.withdrawal),
				performancePost("income", "2026-06-01", "Assets:Fund", "INR", tc.gain, tc.gain),
				performancePost("income", "2026-06-01", "Income:Interest:Fund", "INR", -tc.gain, -tc.gain),
			}
			require.NoError(t, db.Create(&ps).Error)
			r, err := GetInvestmentPerformance(db, PerformanceOptions{Drivers: true, Timeline: true})
			require.NoError(t, err)
			require.True(t, r.OpeningValue.Equal(decimal.NewFromInt(tc.opening)))
			require.True(t, r.ClosingValue.Equal(decimal.NewFromInt(tc.closing)))
			require.True(t, r.InvestmentReturn.Equal(decimal.NewFromInt(tc.gain)))
			require.True(t, r.Contributions.Equal(decimal.NewFromInt(tc.contribution)))
			require.True(t, r.Withdrawals.Equal(decimal.NewFromInt(tc.withdrawal)))
			require.Equal(t, "complete", r.Quality.Status)
			require.Len(t, r.Drivers, 1)
			require.Equal(t, "2026-03-31", r.Timeline[0].Date)
			last := r.Timeline[len(r.Timeline)-1]
			require.True(t, last.Value.Sub(last.ContributionBaseline).Equal(r.InvestmentReturn))
		})
	}
}
func TestPerformanceTransferAndHierarchy(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("parent", "2026-03-31", "Assets:Brokerage", "INR", 100, 100),
		performancePost("open", "2026-03-31", "Assets:Brokerage:A", "INR", 100000, 100000),
		performancePost("transfer", "2026-04-15", "Assets:Brokerage:A", "INR", -100000, -100000),
		performancePost("transfer", "2026-04-15", "Assets:Brokerage:B", "INR", 100000, 100000),
		performancePost("unrelated", "2026-04-15", "Assets:BrokerageOld", "INR", 50, 50),
	}
	require.NoError(t, db.Create(&ps).Error)
	r, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage", Drivers: true})
	require.NoError(t, err)
	require.True(t, r.Contributions.IsZero())
	require.True(t, r.Withdrawals.IsZero())
	require.True(t, r.InvestmentReturn.IsZero())
	require.Len(t, r.Drivers, 3)
	require.Equal(t, "100100", r.ClosingValue.String())
	r, err = GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage:A"})
	require.NoError(t, err)
	require.Equal(t, "100000", r.Withdrawals.String())
	r, err = GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage:B"})
	require.NoError(t, err)
	require.Equal(t, "100000", r.Contributions.String())
}
func TestDividendCorrectionAcrossNetworthPaths(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-04-03")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("open", "2026-04-01", "Assets:Fund", "INR", 100000, 100000),
		performancePost("div", "2026-04-02", "Assets:Fund", "INR", 15000, 15000),
		performancePost("div", "2026-04-02", "Income:Dividend", "INR", -5000, -5000),
		performancePost("div", "2026-04-02", "Assets:Checking", "INR", -10000, -10000),
	}
	require.NoError(t, db.Create(&ps).Error)
	selected := ps[:2]
	for _, n := range []Networth{ComputeNetworth(db, selected), ComputeNetworthOn(db, selected, utils.EndOfToday()), ComputeNetworthTimeline(db, selected, false)[2]} {
		require.Equal(t, "110000", n.InvestmentAmount.String())
		require.Equal(t, "5000", n.GainAmount.String())
		require.Equal(t, "115000", n.BalanceAmount.String())
	}
	r, err := GetInvestmentPerformance(db, PerformanceOptions{})
	require.NoError(t, err)
	require.Equal(t, "5000", r.InvestmentReturn.String())
}
func TestPerformanceSaleAndSplit(t *testing.T) {
	for _, split := range []bool{false, true} {
		t.Run(fmt.Sprint(split), func(t *testing.T) {
			db := serviceTestDB(t)
			utils.SetNow("2026-04-30")
			t.Cleanup(utils.ResetNow)
			ps := []posting.Posting{performancePost("buy", "2026-03-01", "Assets:Fund", "STOCK", 100000, 1000)}
			closePrice := int64(120)
			if split {
				closePrice = 50
				ps = append(ps, performancePost("split", "2026-04-02", "Assets:Fund", "STOCK", -100000, -1000), performancePost("split", "2026-04-02", "Assets:Fund", "STOCK", 100000, 2000))
			} else {
				ps = append(ps, performancePost("sale", "2026-04-02", "Assets:Fund", "STOCK", -100000, -1000), performancePost("sale", "2026-04-02", "Income:CapitalGains:Fund", "INR", -20000, -20000), performancePost("sale", "2026-04-02", "Assets:Checking", "INR", 120000, 120000))
			}
			require.NoError(t, db.Create(&ps).Error)
			prices := []price.Price{{CommodityName: "STOCK", CommodityType: config.Stock, Date: ps[0].Date, Value: decimal.NewFromInt(100)}, {CommodityName: "STOCK", CommodityType: config.Stock, Date: ps[1].Date, Value: decimal.NewFromInt(closePrice)}}
			require.NoError(t, db.Create(&prices).Error)
			r, err := GetInvestmentPerformance(db, PerformanceOptions{Drivers: true})
			require.NoError(t, err)
			if split {
				require.True(t, r.InvestmentReturn.IsZero())
				require.True(t, r.Withdrawals.IsZero())
			} else {
				require.Equal(t, "20000", r.InvestmentReturn.String())
				require.Equal(t, "120000", r.Withdrawals.String())
			}
		})
	}
}
func TestModifiedDietzTimingAndThresholds(t *testing.T) {
	serviceTestDB(t)
	start := performancePost("", "2026-04-01", "", "", 0, 0).Date
	end := start.AddDate(0, 0, 29)
	flow := PerformanceCashFlow{Date: start.AddDate(0, 0, 14), Amount: decimal.NewFromInt(50000)}
	r := ModifiedDietz(decimal.NewFromInt(100000), decimal.NewFromInt(10000), []PerformanceCashFlow{flow}, start, end)
	require.NotNil(t, r)
	require.Equal(t, "0.08", r.String())
	newPortfolio := ModifiedDietz(decimal.Zero, decimal.NewFromInt(10000), []PerformanceCashFlow{flow}, start, end)
	require.NotNil(t, newPortfolio)
	require.Equal(t, "0.4", newPortfolio.String())
	flow.Date = end
	r = ModifiedDietz(decimal.NewFromInt(100000), decimal.NewFromInt(10000), []PerformanceCashFlow{flow}, start, end)
	require.Equal(t, "0.1", r.String())
	require.Nil(t, ModifiedDietz(decimal.Zero, decimal.NewFromInt(1), []PerformanceCashFlow{flow}, start, end))
	for _, capital := range []string{"0", "-1", "0.01"} {
		require.Nil(t, ModifiedDietz(decimal.RequireFromString(capital), decimal.NewFromInt(1), nil, start, end))
	}
	require.Nil(t, ModifiedDietz(decimal.NewFromInt(1), decimal.NewFromInt(1), []PerformanceCashFlow{{Date: end, Amount: decimal.NewFromInt(1000000000)}}, start, end))
}
func TestPerformancePeriods(t *testing.T) {
	serviceTestDB(t)
	t.Cleanup(utils.ResetNow)
	for _, tc := range []struct{ now, preset, start, end string }{
		{"2026-09-06", "one_year", "2025-09-07", "2026-09-06"},
		{"2024-02-29", "one_year", "2023-03-01", "2024-02-29"},
		{"2025-02-28", "one_year", "2024-02-29", "2025-02-28"},
		{"2026-04-01", "previous_fy", "2025-04-01", "2026-03-31"},
	} {
		utils.SetNow(tc.now)
		start, end, err := resolvePerformancePeriod(PerformanceOptions{Preset: tc.preset}, time.Time{})
		require.NoError(t, err)
		require.Equal(t, tc.start, start.Format("2006-01-02"))
		require.Equal(t, tc.end, end.Format("2006-01-02"))
	}
	for _, o := range []PerformanceOptions{{From: "bad", To: "2026-01-01"}, {From: "2026-01-01"}, {From: "2026-04-02", To: "2026-04-01"}, {From: "2026-04-01", To: "2026-04-02"}, {Preset: "one_year", From: "2026-01-01", To: "2026-02-01"}} {
		_, _, err := resolvePerformancePeriod(o, time.Time{})
		require.ErrorIs(t, err, ErrPerformanceRange)
	}
}

func TestPerformanceQualityBoundaries(t *testing.T) {
	for _, tc := range []struct {
		name                       string
		openingQuote, closingQuote bool
		want                       string
	}{
		{"both market", true, true, "complete"}, {"missing opening", false, true, "partial"}, {"trade only", false, false, "partial"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := serviceTestDB(t)
			utils.SetNow("2026-09-06")
			t.Cleanup(utils.ResetNow)
			ps := []posting.Posting{performancePost("buy", "2026-03-01", "Assets:Fund", "STOCK", 1000, 10), performancePost("buy", "2026-03-01", "Assets:Checking", "INR", -1000, -1000)}
			require.NoError(t, db.Create(&ps).Error)
			prices := []price.Price{{CommodityName: "STOCK", CommodityType: config.Unknown, Date: ps[0].Date, Value: decimal.NewFromInt(100)}}
			if tc.openingQuote {
				prices = append(prices, price.Price{CommodityName: "STOCK", CommodityType: config.Stock, Date: ps[0].Date, Value: decimal.NewFromInt(100)})
			}
			if tc.closingQuote {
				prices = append(prices, price.Price{CommodityName: "STOCK", CommodityType: config.Stock, Date: performancePost("", "2026-09-01", "", "", 0, 0).Date, Value: decimal.NewFromInt(120)})
			}
			require.NoError(t, db.Create(&prices).Error)
			r, err := GetInvestmentPerformance(db, PerformanceOptions{Timeline: true})
			require.NoError(t, err)
			require.Equal(t, tc.want, r.Quality.Status)
			if tc.want == "partial" {
				require.Nil(t, r.PeriodReturn)
			} else {
				require.NotNil(t, r.PeriodReturn)
			}
		})
	}
}
func TestPerformanceCompleteWithUnavailableReturn(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{performancePost("new", "2026-09-06", "Assets:Fund", "INR", 1000, 1000)}
	require.NoError(t, db.Create(&ps).Error)
	r, err := GetInvestmentPerformance(db, PerformanceOptions{From: "2026-09-06", To: "2026-09-06"})
	require.NoError(t, err)
	require.Equal(t, "complete", r.Quality.Status)
	require.Nil(t, r.PeriodReturn)
	require.Equal(t, "insufficient_weighted_capital", *r.ReturnUnavailableReason)
}
func TestPerformanceUnattributedIncomeAndExcludedPostings(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("open", "2026-03-01", "Assets:Fund", "INR", 1000, 1000),
		performancePost("div", "2026-04-01", "Income:Dividend:Fund", "INR", -100, -100),
		performancePost("div", "2026-04-01", "Assets:Checking", "INR", 100, 100),
		performancePost("future", "2027-04-01", "Assets:Fund", "INR", 500, 500),
		performancePost("forecast", "2026-04-01", "Assets:Fund", "INR", 900, 900),
	}
	ps[4].Forecast = true
	require.NoError(t, db.Create(&ps).Error)
	r, err := GetInvestmentPerformance(db, PerformanceOptions{Drivers: true})
	require.NoError(t, err)
	require.Equal(t, "1000", r.ClosingValue.String())
	require.Equal(t, "partial", r.Quality.Status)
	require.Nil(t, r.PeriodReturn)
	require.Equal(t, "unattributed_investment_income", *r.ReturnUnavailableReason)
	require.Len(t, r.Drivers, 1)
	require.Nil(t, r.Drivers[0].PeriodReturn)
	require.Equal(t, "unattributed_investment_income", *r.Drivers[0].ReturnUnavailableReason)
}

func TestIntermediateFallbackDoesNotInvalidateEndpointReturn(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("open", "2026-03-01", "Assets:Fund", "INR", 1000, 1000),
		performancePost("buy", "2026-05-01", "Assets:Fund", "STOCK", 1000, 10),
		performancePost("buy", "2026-05-01", "Assets:Fund", "INR", -1000, -1000),
		performancePost("sell", "2026-08-01", "Assets:Fund", "STOCK", -1000, -10),
		performancePost("sell", "2026-08-01", "Assets:Fund", "INR", 1200, 1200),
		performancePost("sell", "2026-08-01", "Income:CapitalGains:Fund", "INR", -200, -200),
	}
	require.NoError(t, db.Create(&ps).Error)
	require.NoError(t, db.Create(&price.Price{CommodityName: "STOCK", CommodityType: config.Unknown, Date: ps[1].Date, Value: decimal.NewFromInt(100)}).Error)
	r, err := GetInvestmentPerformance(db, PerformanceOptions{Timeline: true})
	require.NoError(t, err)
	require.Equal(t, "complete", r.Quality.Status)
	require.NotNil(t, r.PeriodReturn)
	require.Equal(t, "0.2", r.PeriodReturn.String())
	partial := false
	for _, p := range r.Timeline {
		partial = partial || p.Quality.Status == performancePartial
	}
	require.True(t, partial)
}

func TestPerformanceQueriesAreIndependentOfTimelineDays(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := make([]posting.Posting, 0, 30)
	for i := range 30 {
		ps = append(ps, performancePost(fmt.Sprint(i), "2020-01-01", fmt.Sprintf("Assets:Fund:%d", i), "INR", 1000, 1000))
	}
	require.NoError(t, db.Create(&ps).Error)
	queries := 0
	require.NoError(t, db.Callback().Query().Before("gorm:query").Register("count_performance_queries", func(_ *gorm.DB) { queries++ }))
	_, err := GetInvestmentPerformance(db, PerformanceOptions{Preset: "since_inception", Drivers: true, Timeline: true})
	require.NoError(t, err)
	require.LessOrEqual(t, queries, 10, "SQL must not scale with accounts or timeline boundaries")
}

func TestPerformanceXIRRRatioConversion(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-01-01")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("open", "2025-01-01", "Assets:Fund", "INR", 10000, 10000),
		performancePost("income", "2025-12-31", "Assets:Fund", "INR", 1000, 1000),
		performancePost("income", "2025-12-31", "Income:Interest:Fund", "INR", -1000, -1000),
	}
	require.NoError(t, db.Create(&ps).Error)
	legacy := XIRR(db, PopulateMarketPrice(db, ps[:2]))
	require.Equal(t, "9.97", legacy.String())
	r, err := GetInvestmentPerformance(db, PerformanceOptions{})
	require.NoError(t, err)
	require.NotNil(t, r.SinceInceptionXIRR)
	require.Equal(t, "0.0997", r.SinceInceptionXIRR.String())
}

func TestModifiedDietzUsesCalendarDaysAcrossDST(t *testing.T) {
	serviceTestDB(t)
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\ntime_zone: America/New_York\n"), ""))
	start := performancePost("", "2026-03-07", "", "", 0, 0).Date
	end := performancePost("", "2026-03-09", "", "", 0, 0).Date
	flow := PerformanceCashFlow{Date: performancePost("", "2026-03-08", "", "", 0, 0).Date, Amount: decimal.NewFromInt(300)}
	value := ModifiedDietz(decimal.NewFromInt(100), decimal.NewFromInt(20), []PerformanceCashFlow{flow}, start, end)
	require.NotNil(t, value)
	require.True(t, value.Sub(decimal.RequireFromString("0.1")).Abs().LessThan(decimal.RequireFromString("0.000000000001")))
	require.Equal(t, "America/New_York", start.Location().String())
}

func TestPerformanceAttributionABIsolation(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("openA", "2026-03-01", "Assets:Brokerage:A", "INR", 1000, 1000),
		performancePost("openB", "2026-03-01", "Assets:Brokerage:B", "INR", 1000, 1000),
		// Income evidence positively associated with B (does not affect A)
		performancePost("divB", "2026-04-01", "Income:Dividend", "INR", -100, -100),
		performancePost("divB", "2026-04-01", "Assets:Checking", "INR", 100, 100),
		performancePost("divB", "2026-04-01", "Assets:Brokerage:B", "INR", 100, 100),
	}
	require.NoError(t, db.Create(&ps).Error)

	// Drivers check: A must remain complete with available return
	r, err := GetInvestmentPerformance(db, PerformanceOptions{Drivers: true})
	require.NoError(t, err)
	var driverA *PerformanceDriver
	for i := range r.Drivers {
		if r.Drivers[i].Account == "Assets:Brokerage:A" {
			driverA = &r.Drivers[i]
			break
		}
	}
	require.NotNil(t, driverA)
	require.Equal(t, "complete", driverA.Quality.Status)
	require.NotNil(t, driverA.PeriodReturn)
	require.Nil(t, driverA.ReturnUnavailableReason)

	// Drilldown check for A
	rA, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage:A"})
	require.NoError(t, err)
	require.Equal(t, "complete", rA.Quality.Status)
	require.NotNil(t, rA.PeriodReturn)
	require.Nil(t, rA.ReturnUnavailableReason)
}

func TestPerformanceAttributionHierarchyAndMixedTransaction(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	ps := []posting.Posting{
		performancePost("openA", "2026-03-01", "Assets:Brokerage:A", "INR", 1000, 1000),
		performancePost("openB", "2026-03-01", "Assets:Brokerage:B", "INR", 1000, 1000),
		performancePost("openC", "2026-03-01", "Assets:Retirement:C", "INR", 1000, 1000),
		// Mixed income evidence containing both A and B (and multiple postings to A to test deduplication)
		performancePost("mixed", "2026-04-01", "Income:Dividend", "INR", -100, -100),
		performancePost("mixed", "2026-04-01", "Assets:Checking", "INR", 100, 100),
		performancePost("mixed", "2026-04-01", "Assets:Brokerage:A", "INR", 50, 50),
		performancePost("mixed", "2026-04-01", "Assets:Brokerage:A", "INR", 10, 10),
		performancePost("mixed", "2026-04-01", "Assets:Brokerage:B", "INR", 40, 40),
	}
	require.NoError(t, db.Create(&ps).Error)

	// 1. Assets:Brokerage (parent of A and B) contains all accounts in the evidence -> complete
	rBrokerage, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage"})
	require.NoError(t, err)
	require.Equal(t, "complete", rBrokerage.Quality.Status)
	require.NotNil(t, rBrokerage.PeriodReturn)
	require.Nil(t, rBrokerage.ReturnUnavailableReason)

	// 2. Assets:Brokerage:A (matches 1 of 2 accounts in evidence) -> partial
	rA, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage:A"})
	require.NoError(t, err)
	require.Equal(t, "partial", rA.Quality.Status)
	require.Nil(t, rA.PeriodReturn)
	require.Equal(t, "unattributed_investment_income", *rA.ReturnUnavailableReason)
	// Deduplication check: reason appears exactly once
	countA := 0
	for _, reason := range rA.Quality.Reasons {
		if reason.Code == "unattributed_investment_income" {
			countA++
		}
	}
	require.Equal(t, 1, countA)

	// 3. Assets:Brokerage:B (matches 1 of 2 accounts in evidence) -> partial
	rB, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Brokerage:B"})
	require.NoError(t, err)
	require.Equal(t, "partial", rB.Quality.Status)
	require.Nil(t, rB.PeriodReturn)
	require.Equal(t, "unattributed_investment_income", *rB.ReturnUnavailableReason)

	// 4. Assets:Retirement:C (unrelated, matches 0 accounts in evidence) -> complete
	rC, err := GetInvestmentPerformance(db, PerformanceOptions{AccountPrefix: "Assets:Retirement:C"})
	require.NoError(t, err)
	require.Equal(t, "complete", rC.Quality.Status)
	require.NotNil(t, rC.PeriodReturn)
	require.Nil(t, rC.ReturnUnavailableReason)

	// 5. Whole portfolio (contains A, B, and C) -> complete
	rAll, err := GetInvestmentPerformance(db, PerformanceOptions{})
	require.NoError(t, err)
	require.Equal(t, "complete", rAll.Quality.Status)
	require.NotNil(t, rAll.PeriodReturn)
	require.Nil(t, rAll.ReturnUnavailableReason)
}
