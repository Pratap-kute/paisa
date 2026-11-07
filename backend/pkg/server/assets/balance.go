package assets

import (
	"strings"

	"github.com/samber/lo"
	"github.com/shopspring/decimal"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AssetBreakdown struct {
	Group            string          `json:"group"`
	InvestmentAmount decimal.Decimal `json:"investmentAmount"`
	WithdrawalAmount decimal.Decimal `json:"withdrawalAmount"`
	MarketAmount     decimal.Decimal `json:"marketAmount"`
	CashAmount       decimal.Decimal `json:"cashAmount"`
	BalanceUnits     decimal.Decimal `json:"balanceUnits"`
	LatestPrice      decimal.Decimal `json:"latestPrice"`
	XIRR             decimal.Decimal `json:"xirr"`
	GainAmount       decimal.Decimal `json:"gainAmount"`
	AbsoluteReturn   decimal.Decimal `json:"absoluteReturn"`
}

func GetCheckingBalance(db *gorm.DB) gin.H {
	return doGetBalance(db, "Assets:Checking:%", false)
}

func GetBalance(db *gorm.DB) gin.H {
	return doGetBalance(db, "Assets:%", true)
}

func doGetBalance(db *gorm.DB, pattern string, rollup bool) gin.H {
	postings := query.Init(db).Like(pattern, "Income:CapitalGains:%").UntilToday().All()
	postings = service.PopulateMarketPrice(db, postings)
	breakdowns := ComputeBreakdowns(db, postings, rollup)
	return gin.H{"asset_breakdowns": breakdowns}
}

func ComputeBreakdowns(db *gorm.DB, postings []posting.Posting, rollup bool) map[string]AssetBreakdown {
	accounts := make(map[string]bool)
	for i := range postings {
		p := &postings[i]
		if service.IsCapitalGains(*p) {
			continue
		}

		if rollup {
			parts := make([]string, 0, 4)
			for part := range strings.SplitSeq(p.Account, ":") {
				parts = append(parts, part)
				accounts[strings.Join(parts, ":")] = false
			}
		}
		accounts[p.Account] = true

	}

	result := make(map[string]AssetBreakdown)

	for group, leaf := range accounts {
		ps := lo.Filter(postings, func(p posting.Posting, _ int) bool {
			account := p.Account
			if service.IsCapitalGains(p) {
				account = service.CapitalGainsSourceAccount(p.Account)
			}
			return utils.IsSameOrParent(account, group)
		})
		result[group] = ComputeBreakdown(db, ps, leaf, group)
	}

	return result
}

// ComputeBreakdown summarises one account group. Investment, withdrawal, gain
// and XIRR come from the same event based accounting as the Net Worth and Gain
// pages (service.ComputeNetworth, service.XIRR), so all of them agree. Cash is
// not an investment: checking accounts report their balance but no returns, and
// checking postings never count towards the gain of a parent group. As a result
// the gain of a group that holds checking is not marketAmount minus net
// investment; it is the gain of its investment accounts only. CashAmount is the
// checking balance inside the group, so MarketAmount minus CashAmount is the
// value of the investments that the gain refers to.
func ComputeBreakdown(db *gorm.DB, ps []posting.Posting, leaf bool, group string) AssetBreakdown {
	psWithoutCapitalGains := lo.Filter(ps, func(p posting.Posting, _ int) bool {
		return !service.IsCapitalGains(p)
	})
	marketAmount := accounting.CurrentBalance(psWithoutCapitalGains)
	cashAmount := accounting.CurrentBalance(lo.Filter(psWithoutCapitalGains, func(p posting.Posting, _ int) bool {
		return utils.IsCheckingAccount(p.Account)
	}))
	var balanceUnits decimal.Decimal
	if leaf {
		balanceUnits = lo.Reduce(ps, func(acc decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if !utils.IsCurrency(p.Commodity) {
				return acc.Add(p.Quantity)
			}
			return decimal.Zero
		}, decimal.Zero)
	}

	breakdown := AssetBreakdown{
		Group:        group,
		MarketAmount: marketAmount,
		CashAmount:   cashAmount,
		BalanceUnits: balanceUnits,
	}

	investmentPostings := lo.Filter(ps, func(p posting.Posting, _ int) bool {
		account := p.Account
		if service.IsCapitalGains(p) {
			account = service.CapitalGainsSourceAccount(p.Account)
		}
		return !utils.IsCheckingAccount(account)
	})
	if utils.IsCheckingAccount(group) || len(investmentPostings) == 0 {
		return breakdown
	}

	networth := service.ComputeNetworth(db, investmentPostings)
	breakdown.InvestmentAmount = networth.InvestmentAmount
	breakdown.WithdrawalAmount = networth.WithdrawalAmount
	breakdown.GainAmount = networth.GainAmount
	breakdown.XIRR = service.XIRR(db, investmentPostings)
	if !networth.InvestmentAmount.IsZero() {
		breakdown.AbsoluteReturn = networth.GainAmount.Div(networth.InvestmentAmount)
	}
	return breakdown
}
