package service

import (
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// investmentEvent is the sole interpretation of a posting for cumulative and
// period accounting. Flow is positive for supplied capital, negative for removal.
// Value and units remain separate from capital: income and splits are not deposits.
type investmentEvent struct {
	Posting      posting.Posting
	Account      string
	CapitalGains bool
	Flow         decimal.Decimal
	// ActivityFlow preserves goal cash movement: interest expenses paid out are withdrawals.
	ActivityFlow decimal.Decimal
	Value        decimal.Decimal
	Units        decimal.Decimal
}

func classifyInvestmentEvents(ps, counterparts []posting.Posting) []investmentEvent {
	txs := make(map[string][]posting.Posting)
	dividends := buildDividendFlows(counterparts)
	for i := range counterparts {
		p := &counterparts[i]
		txs[p.TransactionID] = append(txs[p.TransactionID], *p)
	}
	events := make([]investmentEvent, 0, len(ps))
	for i := range ps {
		p := &ps[i]
		e := investmentEvent{Posting: *p, Account: p.Account, Flow: p.Amount, ActivityFlow: p.Amount, Value: p.Amount, Units: p.Quantity}
		if IsCapitalGains(*p) {
			e.CapitalGains = true
			e.Account = CapitalGainsSourceAccount(p.Account)
			e.Value, e.Units = decimal.Zero, decimal.Zero
		} else {
			split := !utils.IsCurrency(p.Commodity) && len(txs[p.TransactionID]) > 0
			interest := false
			repayment := utils.IsCurrency(p.Commodity) && utils.IsParent(p.Account, "Expenses:Interest")
			for j := range txs[p.TransactionID] {
				q := &txs[p.TransactionID][j]
				if utils.IsCurrency(q.Commodity) || q.Account != p.Account {
					split = false
				}
				if utils.IsCurrency(p.Commodity) && q.Amount.Neg().Equal(p.Amount) {
					if utils.IsParent(q.Account, "Income:Interest") {
						interest = true
					}
					if utils.IsParent(q.Account, "Expenses:Interest") {
						repayment = true
					}
				}
			}
			if split || interest {
				e.Flow = decimal.Zero
			} else {
				e.Flow = e.Flow.Sub(dividendReturnShare(dividends[p.TransactionID], *p))
			}
			e.ActivityFlow = e.Flow
			if repayment {
				e.Flow = decimal.Zero
			}
		}
		events = append(events, e)
	}
	return events
}

func loadInvestmentEvents(db *gorm.DB, ps []posting.Posting) []investmentEvent {
	ids := make([]string, 0, len(ps))
	seen := map[string]bool{}
	for i := range ps {
		p := &ps[i]
		if !seen[p.TransactionID] {
			ids = append(ids, p.TransactionID)
			seen[p.TransactionID] = true
		}
	}
	counterparts := make([]posting.Posting, 0)
	// Bound SQL parameters while avoiding one query per transaction.
	for start := 0; start < len(ids); start += 500 {
		end := start + 500
		if end > len(ids) {
			end = len(ids)
		}
		counterparts = append(counterparts, query.Init(db).Where("transaction_id IN ?", ids[start:end]).All()...)
	}
	return classifyInvestmentEvents(ps, counterparts)
}
