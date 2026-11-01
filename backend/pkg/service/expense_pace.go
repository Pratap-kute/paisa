package service

import (
	"time"

	"github.com/shopspring/decimal"
)

// ExpensePace projects the current month's total spending at the pace so far.
type ExpensePace struct {
	Period            string // YYYY-MM
	ProjectedExpenses decimal.Decimal
	// OverBudget is how far the projection exceeds the plan; nil when it is
	// within the plan or no plan exists.
	OverBudget *decimal.Decimal
}

// ProjectExpensePace extrapolates spending linearly over the days of the month.
// planned is the sum of the month's budget forecasts, or nil when no budget is
// configured. It returns nil until MinElapsedDaysForCalendarPace days have
// passed, as an earlier projection would be noise, and when nothing was spent.
func ProjectExpensePace(spent decimal.Decimal, planned *decimal.Decimal, asOf time.Time) *ExpensePace {
	if !spent.IsPositive() {
		return nil
	}
	elapsedDays := asOf.Day()
	daysInMonth := time.Date(asOf.Year(), asOf.Month()+1, 0, 0, 0, 0, 0, asOf.Location()).Day()
	if elapsedDays < MinElapsedDaysForCalendarPace {
		return nil
	}

	projected := spent.Div(decimal.NewFromInt(int64(elapsedDays))).Mul(decimal.NewFromInt(int64(daysInMonth)))
	pace := &ExpensePace{Period: asOf.Format("2006-01"), ProjectedExpenses: projected}
	if planned != nil && planned.IsPositive() && projected.GreaterThan(*planned) {
		over := projected.Sub(*planned)
		pace.OverBudget = &over
	}
	return pace
}
