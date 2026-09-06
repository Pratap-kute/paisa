package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type ContributionMonth struct {
	Month  string          `json:"month"`
	Amount decimal.Decimal `json:"amount"`
}

// MonthlyContributions measures cash flow, never changes in market value.
// ps must include Assets and Income:CapitalGains postings. FilterByGlob maps
// capital gains to their asset account: a sale's proceeds retained inside the
// selected account set then cancel its cost and realized gain exactly.
// Completed months after the first asset activity are retained, including zeros.
func MonthlyContributions(db *gorm.DB, ps []posting.Posting, accounts []string, asOf time.Time) []ContributionMonth {
	end := utils.BeginningOfMonth(asOf)
	start := end.AddDate(0, -6, 0)
	first := end
	amounts := map[string]decimal.Decimal{}
	selected := accounting.FilterByGlob(ps, accounts)
	for i := range selected {
		p := &selected[i]
		if p.Forecast || !p.Date.Before(end) {
			continue
		}
		if utils.IsParent(p.Account, "Assets") && p.Date.Before(first) {
			first = p.Date
		}
		if p.Date.Before(start) {
			continue
		}
		if IsInterest(db, *p) || IsStockSplit(db, *p) {
			continue
		}
		month := p.Date.Format("2006-01")
		amounts[month] = amounts[month].Add(p.Amount)
	}
	if first.After(start) {
		start = utils.BeginningOfMonth(first)
	}
	result := make([]ContributionMonth, 0, 6)
	for month := start; month.Before(end); month = month.AddDate(0, 1, 0) {
		key := month.Format("2006-01")
		result = append(result, ContributionMonth{Month: key, Amount: amounts[key]})
	}
	return result
}
