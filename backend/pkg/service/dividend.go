package service

import (
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
)

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

func buildDividendFlows(posts []posting.Posting) map[string]dividendFlow {
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
