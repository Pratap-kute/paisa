package service

import (
	"math"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
)

// PostingReturn is the unrealized return of a single commodity posting (one lot).
type PostingReturn struct {
	UnrealizedGain decimal.Decimal
	HoldingDays    int
	// AnnualizedReturn is a compound annual rate in percent (the same scale as
	// XIRR). It is nil for lots held for less than a year: such a period is
	// reported as an absolute gain, never extrapolated.
	AnnualizedReturn *decimal.Decimal
}

// ComputePostingReturn returns the return of a lot as of today. It reports false
// for postings that are not an open lot: currency postings, sales, stock splits
// and lots bought today.
func ComputePostingReturn(p posting.Posting, today time.Time) (PostingReturn, bool) {
	if utils.IsCurrency(p.Commodity) || !p.Quantity.IsPositive() || !p.Amount.IsPositive() {
		return PostingReturn{}, false
	}
	days := int(calendarOrdinal(today) - calendarOrdinal(p.Date))
	if days <= 0 {
		return PostingReturn{}, false
	}

	result := PostingReturn{UnrealizedGain: p.MarketAmount.Sub(p.Amount), HoldingDays: days}
	if days >= 365 && !p.MarketAmount.IsNegative() {
		ratio, _ := p.MarketAmount.Div(p.Amount).Float64()
		annualized := decimal.NewFromFloat((math.Pow(ratio, 365/float64(days)) - 1) * 100).Round(2)
		result.AnnualizedReturn = &annualized
	}
	return result, true
}
