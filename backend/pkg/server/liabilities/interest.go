package liabilities

import (
	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func GetInterest(db *gorm.DB) dto.LiabilitiesInterestResponse {
	postings := query.Init(db).Like("Liabilities:%").All()
	expenses := query.Init(db).Like("Expenses:Interest:%").All()
	postings = service.PopulateMarketPrice(db, postings)
	byAccount := lo.GroupBy(postings, func(p posting.Posting) string { return p.RestName(1) })
	var accounts []string
	seen := make(map[string]bool)
	for i := range postings {
		p := &postings[i]
		acc := p.RestName(1)
		if !seen[acc] {
			seen[acc] = true
			accounts = append(accounts, acc)
		}
	}

	//nolint:prealloc // nil slice required for null JSON serialization when empty
	var interests []dto.LiabilityInterestResponse
	for _, account := range accounts {
		ps := byAccount[account]
		es := lo.Filter(expenses, func(e posting.Posting, _ int) bool { return e.RestName(1) == "Interest:"+account })
		ps = append(ps, es...)
		interests = append(interests, dto.LiabilityInterestResponse{
			Account:          "Liabilities:" + account,
			APR:              service.APR(db, ps),
			OverviewTimeline: computeOverviewTimeline(db, ps),
		})
	}

	return dto.LiabilitiesInterestResponse{InterestTimelineBreakdown: interests}
}

func computeOverviewTimeline(db *gorm.DB, postings []posting.Posting) []dto.LiabilityOverviewResponse {
	accounting.SortAsc(postings)
	netliabilities := []dto.LiabilityOverviewResponse{}

	var p posting.Posting
	var pastPostings []posting.Posting

	if len(postings) == 0 {
		return netliabilities
	}

	end := utils.MaxTime(utils.EndOfToday(), postings[len(postings)-1].Date)
	for start := postings[0].Date; start.Before(end) || start.Equal(end); start = start.AddDate(0, 0, 1) {
		for len(postings) > 0 && (postings[0].Date.Before(start) || postings[0].Date.Equal(start)) {
			p, postings = postings[0], postings[1:]
			pastPostings = append(pastPostings, p)
		}

		drawn := lo.Reduce(pastPostings, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if p.Amount.GreaterThan(decimal.Zero) || utils.IsExpenseInterestAccount(p.Account) {
				return agg
			} else {
				return p.Amount.Neg().Add(agg)
			}
		}, decimal.Zero)

		repaid := lo.Reduce(pastPostings, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if p.Amount.LessThan(decimal.Zero) {
				return agg
			} else {
				return p.Amount.Add(agg)
			}
		}, decimal.Zero)

		balance := lo.Reduce(pastPostings, func(agg decimal.Decimal, p posting.Posting, _ int) decimal.Decimal {
			if utils.IsExpenseInterestAccount(p.Account) {
				return agg
			} else {
				return service.GetMarketPrice(db, p, start).Neg().Add(agg)
			}
		}, decimal.Zero)

		interest := balance.Add(repaid).Sub(drawn)
		netliabilities = append(netliabilities, dto.LiabilityOverviewResponse{Date: start, DrawnAmount: drawn, RepaidAmount: repaid, InterestAmount: interest})

		if len(postings) == 0 && balance.Abs().LessThan(decimal.NewFromFloat(0.01)) {
			break
		}
	}
	return netliabilities
}
