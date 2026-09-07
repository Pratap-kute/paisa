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
	var networth Networth

	if len(postings) == 0 {
		return networth
	}

	investment := decimal.Zero
	withdrawal := decimal.Zero
	balance := decimal.Zero

	now := utils.EndOfToday()
	for i := range postings {
		p := &postings[i]
		isInterest := IsInterest(db, *p)
		isInterestRepayment := IsInterestRepayment(db, *p)
		isStockSplit := IsStockSplit(db, *p)
		isCapitalGains := IsCapitalGains(*p)

		switch {
		case isInterest || isInterestRepayment:
			balance = balance.Add(p.Amount)
		case isCapitalGains:
			withdrawal = withdrawal.Add(p.Amount.Neg())
		default:
			if p.Amount.GreaterThan(decimal.Zero) && !isStockSplit {
				investment = investment.Add(p.Amount)
			}

			if p.Amount.LessThan(decimal.Zero) && !isStockSplit {
				withdrawal = withdrawal.Add(p.Amount.Neg())
			}

			balance = balance.Add(GetMarketPrice(db, *p, now))
		}
	}

	gain := balance.Add(withdrawal).Sub(investment)
	netInvestment := investment.Sub(withdrawal)
	networth = Networth{
		Date:                now,
		InvestmentAmount:    investment,
		WithdrawalAmount:    withdrawal,
		GainAmount:          gain,
		BalanceAmount:       balance,
		NetInvestmentAmount: netInvestment,
	}

	return networth
}

func ComputeNetworthOn(db *gorm.DB, postings []posting.Posting, onDate time.Time) Networth {
	var networth Networth
	if len(postings) == 0 {
		return networth
	}

	type RunningSum struct {
		investment   decimal.Decimal
		withdrawal   decimal.Decimal
		balance      decimal.Decimal
		balanceUnits decimal.Decimal
	}

	accumulator := make(map[string]RunningSum)
	for i := range postings {
		p := &postings[i]
		if p.Date.After(onDate) {
			continue
		}

		rs := accumulator[p.Commodity]
		isInterest := IsInterest(db, *p)
		isInterestRepayment := IsInterestRepayment(db, *p)
		isStockSplit := IsStockSplit(db, *p)
		isCapitalGains := IsCapitalGains(*p)

		switch {
		case isInterest || isInterestRepayment:
			rs.balance = rs.balance.Add(p.Amount)
		case isCapitalGains:
			rs.withdrawal = rs.withdrawal.Add(p.Amount.Neg())
		default:
			if p.Amount.GreaterThan(decimal.Zero) && !isStockSplit {
				rs.investment = rs.investment.Add(p.Amount)
			}

			if p.Amount.LessThan(decimal.Zero) && !isStockSplit {
				rs.withdrawal = rs.withdrawal.Add(p.Amount.Neg())
			}

			rs.balance = rs.balance.Add(GetMarketPrice(db, *p, onDate))
			rs.balanceUnits = rs.balanceUnits.Add(p.Quantity)
		}

		accumulator[p.Commodity] = rs
	}

	investment := decimal.Zero
	withdrawal := decimal.Zero
	balance := decimal.Zero

	for commodity, rs := range accumulator {
		investment = investment.Add(rs.investment)
		withdrawal = withdrawal.Add(rs.withdrawal)

		if utils.IsCurrency(commodity) {
			balance = balance.Add(rs.balance)
		} else {
			price := GetUnitPrice(db, commodity, onDate)
			if !price.Value.Equal(decimal.Zero) {
				balance = balance.Add(rs.balanceUnits.Mul(price.Value))
			} else {
				balance = balance.Add(rs.balance)
			}
		}
	}

	gain := balance.Add(withdrawal).Sub(investment)
	netInvestment := investment.Sub(withdrawal)

	return Networth{
		Date:                onDate,
		InvestmentAmount:    investment,
		WithdrawalAmount:    withdrawal,
		GainAmount:          gain,
		BalanceAmount:       balance,
		NetInvestmentAmount: netInvestment,
	}
}

func ComputeNetworthTimeline(db *gorm.DB, postings []posting.Posting, computeBalanceUnits bool) []Networth {
	var networths []Networth
	var p posting.Posting

	if len(postings) == 0 {
		return []Networth{}
	}

	type RunningSum struct {
		investment   decimal.Decimal
		withdrawal   decimal.Decimal
		balance      decimal.Decimal
		balanceUnits decimal.Decimal
	}

	accumulator := make(map[string]RunningSum)

	end := utils.EndOfToday()
	for start := postings[0].Date; start.Before(end); start = start.AddDate(0, 0, 1) {
		for len(postings) > 0 && (postings[0].Date.Before(start) || postings[0].Date.Equal(start)) {
			p, postings = postings[0], postings[1:]
			rs := accumulator[p.Commodity]

			isInterest := IsInterest(db, p)
			isInterestRepayment := IsInterestRepayment(db, p)
			isStockSplit := IsStockSplit(db, p)
			isCapitalGains := IsCapitalGains(p)

			switch {
			case isInterest || isInterestRepayment:
				rs.balance = rs.balance.Add(p.Amount)
			case isCapitalGains:
				rs.withdrawal = rs.withdrawal.Add(p.Amount.Neg())
			default:
				if p.Amount.GreaterThan(decimal.Zero) && !isStockSplit {
					rs.investment = rs.investment.Add(p.Amount)
				}

				if p.Amount.LessThan(decimal.Zero) && !isStockSplit {
					rs.withdrawal = rs.withdrawal.Add(p.Amount.Neg())
				}

				rs.balance = rs.balance.Add(GetMarketPrice(db, p, start))
				rs.balanceUnits = rs.balanceUnits.Add(p.Quantity)
			}

			accumulator[p.Commodity] = rs
		}

		investment := decimal.Zero
		withdrawal := decimal.Zero
		balance := decimal.Zero
		balanceUnits := decimal.Zero

		for commodity, rs := range accumulator {
			investment = investment.Add(rs.investment)
			withdrawal = withdrawal.Add(rs.withdrawal)

			if utils.IsCurrency(commodity) {
				balance = balance.Add(rs.balance)
			} else {
				if computeBalanceUnits {
					balanceUnits = balanceUnits.Add(rs.balanceUnits)
				}
				price := GetUnitPrice(db, commodity, start)
				if !price.Value.Equal(decimal.Zero) {
					balance = balance.Add(rs.balanceUnits.Mul(price.Value))
				} else {
					balance = balance.Add(rs.balance)
				}
			}
		}

		gain := balance.Add(withdrawal).Sub(investment)
		netInvestment := investment.Sub(withdrawal)
		networths = append(networths, Networth{
			Date:                start,
			InvestmentAmount:    investment,
			WithdrawalAmount:    withdrawal,
			GainAmount:          gain,
			BalanceAmount:       balance,
			BalanceUnits:        balanceUnits,
			NetInvestmentAmount: netInvestment,
		})

		if len(postings) == 0 && balance.Abs().LessThan(decimal.NewFromFloat(0.01)) {
			break
		}
	}
	return networths
}
