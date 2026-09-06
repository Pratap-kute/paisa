package service

import (
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
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
	dividends := dividendFlows(db, start, end)
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
		amounts[month] = amounts[month].Add(p.Amount.Sub(dividendReturnShare(dividends[p.TransactionID], *p)))
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

// Dividend proceeds are investment returns, including direct reinvestment in
// securities. Match the actual transaction, not a coincidental payee/amount.
// In split transactions allocate the dividend across same-direction asset
// postings in proportion to their ledger amounts, capped at the asset flow.
// This preserves any additional capital supplied in a mixed transaction and
// avoids subtracting the full dividend once per destination account.
type dividendFlow struct {
	income         decimal.Decimal
	positiveAssets decimal.Decimal
	negativeAssets decimal.Decimal
}

func dividendFlows(db *gorm.DB, start, end time.Time) map[string]dividendFlow {
	// Query only transactions containing explicit dividend income in this window.
	// No all-history transaction-cache load is needed for currency-only goals.
	ids := db.Model(&posting.Posting{}).Select("transaction_id").
		Where("(account = ? OR account LIKE ?) AND date >= ? AND date < ? AND forecast = ?", "Income:Dividend", "Income:Dividend:%", start, end, false)
	posts := query.Init(db).Where("transaction_id IN (?)", ids).All()
	flows := make(map[string]dividendFlow)
	for i := range posts {
		p := &posts[i]
		flow := flows[p.TransactionID]
		if utils.IsSameOrParent(p.Account, "Income:Dividend") {
			flow.income = flow.income.Sub(p.Amount)
		}
		if utils.IsParent(p.Account, "Assets") {
			if p.Amount.IsPositive() {
				flow.positiveAssets = flow.positiveAssets.Add(p.Amount)
			}
			if p.Amount.IsNegative() {
				flow.negativeAssets = flow.negativeAssets.Add(p.Amount.Abs())
			}
		}
		flows[p.TransactionID] = flow
	}
	return flows
}

func dividendReturnShare(flow dividendFlow, p posting.Posting) decimal.Decimal {
	if p.TransactionID == "" || !utils.IsParent(p.Account, "Assets") || p.Amount.IsZero() || flow.income.Sign() != p.Amount.Sign() {
		return decimal.Zero
	}
	assetFlow := flow.positiveAssets
	if p.Amount.IsNegative() {
		assetFlow = flow.negativeAssets
	}
	if assetFlow.IsZero() {
		return decimal.Zero
	}
	return p.Amount.Mul(decimal.Min(flow.income.Abs(), assetFlow)).Div(assetFlow)
}
