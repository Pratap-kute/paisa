package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Networth struct {
	Date                time.Time       `json:"date"`
	InvestmentAmount    decimal.Decimal `json:"investmentAmount"`
	WithdrawalAmount    decimal.Decimal `json:"withdrawalAmount"`
	GainAmount          decimal.Decimal `json:"gainAmount"`
	BalanceAmount       decimal.Decimal `json:"balanceAmount"`
	BalanceUnits        decimal.Decimal `json:"balanceUnits"`
	NetInvestmentAmount decimal.Decimal `json:"netInvestmentAmount"`
}

type NetworthResult struct {
	Timeline []Networth
	XIRR     decimal.Decimal
}

type CurrentNetworthResult struct {
	Networth Networth
	XIRR     decimal.Decimal
}

func GetNetworth(db *gorm.DB) NetworthResult {
	postings := query.Init(db).Like("Assets:%", "Income:CapitalGains:%", "Liabilities:%").UntilToday().All()
	postings = PopulateMarketPrice(db, postings)
	networthTimeline := ComputeNetworthTimeline(db, postings, false)
	xirr := XIRR(db, postings)
	return NetworthResult{Timeline: networthTimeline, XIRR: xirr}
}

func GetCurrentNetworth(db *gorm.DB) CurrentNetworthResult {
	postings := query.Init(db).Like("Assets:%", "Income:CapitalGains:%", "Liabilities:%").UntilToday().All()
	postings = PopulateMarketPrice(db, postings)
	networth := ComputeNetworth(db, postings)
	xirr := XIRR(db, postings)
	return CurrentNetworthResult{Networth: networth, XIRR: xirr}
}

func ComputeNetworth(db *gorm.DB, postings []posting.Posting) Networth {
	if len(postings) == 0 {
		return Networth{}
	}
	return computeEventNetworth(db, loadInvestmentEvents(db, postings), utils.EndOfToday())
}

func ComputeNetworthOn(db *gorm.DB, postings []posting.Posting, onDate time.Time) Networth {
	if len(postings) == 0 {
		return Networth{}
	}
	return computeEventNetworth(db, loadInvestmentEvents(db, postings), onDate)
}

type eventHolding struct{ amount, quantity decimal.Decimal }
type eventAccumulator struct {
	investment, withdrawal decimal.Decimal
	holdings               map[string]eventHolding
}

func newEventAccumulator() *eventAccumulator {
	return &eventAccumulator{holdings: map[string]eventHolding{}}
}
func (a *eventAccumulator) add(e investmentEvent) {
	if e.CapitalGains {
		a.withdrawal = a.withdrawal.Sub(e.Flow)
	} else {
		if e.Flow.IsPositive() {
			a.investment = a.investment.Add(e.Flow)
		}
		if e.Flow.IsNegative() {
			a.withdrawal = a.withdrawal.Sub(e.Flow)
		}
	}
	h := a.holdings[e.Posting.Commodity]
	h.amount = h.amount.Add(e.Value)
	h.quantity = h.quantity.Add(e.Units)
	a.holdings[e.Posting.Commodity] = h
}
func (a *eventAccumulator) value(db *gorm.DB, date time.Time, units bool) Networth {
	result := Networth{Date: date, InvestmentAmount: a.investment, WithdrawalAmount: a.withdrawal}
	for commodity, h := range a.holdings {
		value := h.amount
		if !utils.IsCurrency(commodity) {
			p := GetUnitPrice(db, commodity, date)
			if !p.Value.IsZero() {
				value = h.quantity.Mul(p.Value)
			}
			if units {
				result.BalanceUnits = result.BalanceUnits.Add(h.quantity)
			}
		}
		result.BalanceAmount = result.BalanceAmount.Add(value)
	}
	result.NetInvestmentAmount = result.InvestmentAmount.Sub(result.WithdrawalAmount)
	result.GainAmount = result.BalanceAmount.Sub(result.NetInvestmentAmount)
	return result
}
func computeEventNetworth(db *gorm.DB, events []investmentEvent, date time.Time) Networth {
	a := newEventAccumulator()
	for i := range events {
		e := &events[i]
		if !e.Posting.Date.After(date) {
			a.add(*e)
		}
	}
	return a.value(db, date, false)
}

func ComputeNetworthTimeline(db *gorm.DB, postings []posting.Posting, computeBalanceUnits bool) []Networth {
	result := []Networth{}
	if len(postings) == 0 {
		return result
	}
	events := loadInvestmentEvents(db, postings)
	end := utils.EndOfToday()
	accumulator := newEventAccumulator()
	next := 0
	for date := postings[0].Date; date.Before(end); date = date.AddDate(0, 0, 1) {
		for next < len(events) && !events[next].Posting.Date.After(date) {
			accumulator.add(events[next])
			next++
		}
		n := accumulator.value(db, date, computeBalanceUnits)
		result = append(result, n)
		if !date.Before(postings[len(postings)-1].Date) && n.BalanceAmount.Abs().LessThan(decimal.NewFromFloat(0.01)) {
			break
		}
	}
	return result
}
