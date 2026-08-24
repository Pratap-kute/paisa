package liabilities

import (
	"sort"
	"strings"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func GetBalance(db *gorm.DB) dto.LiabilitiesBalanceResponse {
	postings := query.Init(db).Like("Liabilities:%").All()
	expenses := query.Init(db).Like("Expenses:Interest:%").All()
	postings = service.PopulateMarketPrice(db, postings)
	breakdowns := computeBreakdown(db, postings, expenses)
	return dto.LiabilitiesBalanceResponse{LiabilityBreakdowns: breakdowns}
}

func computeBreakdown(db *gorm.DB, postings, expenses []posting.Posting) map[string]dto.LiabilityBreakdownResponse {
	accounts := make(map[string]bool)
	for i := range postings {
		p := &postings[i]
		parts := make([]string, 0, 4)
		for part := range strings.SplitSeq(p.Account, ":") {
			parts = append(parts, part)
			accounts[strings.Join(parts, ":")] = false
		}
		accounts[p.Account] = true
	}

	result := make(map[string]dto.LiabilityBreakdownResponse)

	for group := range accounts {
		ps := lo.Filter(postings, func(p posting.Posting, _ int) bool { return utils.IsSameOrParent(p.Account, group) })
		es := lo.Filter(expenses, func(e posting.Posting, _ int) bool { return utils.IsSameOrParent("Liabilities:"+e.RestName(2), group) })
		sort.Slice(ps, func(i, j int) bool { return ps[i].Date.Before(ps[j].Date) })
		ps = append(ps, es...)

		drawn := lo.Reduce(ps, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if p.Amount.GreaterThan(decimal.Zero) || utils.IsExpenseInterestAccount(p.Account) {
				return agg
			} else {
				return p.Amount.Neg().Add(agg)
			}
		}, decimal.Zero)

		repaid := lo.Reduce(ps, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if p.Amount.LessThan(decimal.Zero) {
				return agg
			} else {
				return p.Amount.Add(agg)
			}
		}, decimal.Zero)

		balance := lo.Reduce(ps, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if utils.IsExpenseInterestAccount(p.Account) {
				return agg
			} else {
				return p.MarketAmount.Neg().Add(agg)
			}
		}, decimal.Zero)

		interest := balance.Add(repaid).Sub(drawn)

		apr := service.APR(db, ps)
		breakdown := dto.LiabilityBreakdownResponse{
			DrawnAmount:    drawn,
			RepaidAmount:   repaid,
			BalanceAmount:  balance,
			APR:            apr,
			Group:          group,
			InterestAmount: interest,
		}
		result[group] = breakdown
	}

	return result
}
