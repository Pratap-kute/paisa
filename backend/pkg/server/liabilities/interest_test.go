package liabilities

import (
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComputeOverviewTimelineMaintainsRunningTotals(t *testing.T) {
	db := liabilityTestDB(t)
	today := utils.EndOfToday()
	loanDate := today.AddDate(0, 0, -2)
	repaymentDate := today.AddDate(0, 0, -1)
	postings := []posting.Posting{
		{
			Date:      loanDate,
			Account:   "Liabilities:HomeLoan",
			Commodity: "INR",
			Quantity:  decimal.NewFromInt(-100),
			Amount:    decimal.NewFromInt(-100),
		},
		{
			Date:      repaymentDate,
			Account:   "Liabilities:HomeLoan",
			Commodity: "INR",
			Quantity:  decimal.NewFromInt(20),
			Amount:    decimal.NewFromInt(20),
		},
		{
			Date:      repaymentDate,
			Account:   "Expenses:Interest:HomeLoan",
			Commodity: "INR",
			Quantity:  decimal.NewFromInt(5),
			Amount:    decimal.NewFromInt(5),
		},
	}

	timeline := computeOverviewTimeline(db, postings)

	require.Len(t, timeline, 3)
	assert.Equal(t, "100", timeline[0].DrawnAmount.String())
	assert.Equal(t, "0", timeline[0].RepaidAmount.String())
	assert.Equal(t, "0", timeline[0].InterestAmount.String())

	for _, point := range timeline[1:] {
		assert.Equal(t, "100", point.DrawnAmount.String())
		assert.Equal(t, "25", point.RepaidAmount.String())
		assert.Equal(t, "5", point.InterestAmount.String())
	}
}

func TestComputeOverviewTimelineRepricesCommodityPositions(t *testing.T) {
	db := liabilityTestDB(t)
	today := utils.EndOfToday()
	prices := []price.Price{
		{Date: today.AddDate(0, 0, -2), CommodityType: config.Stock, CommodityName: "BOND", Value: decimal.NewFromInt(10)},
		{Date: today.AddDate(0, 0, -1), CommodityType: config.Stock, CommodityName: "BOND", Value: decimal.NewFromInt(12)},
		{Date: today, CommodityType: config.Stock, CommodityName: "BOND", Value: decimal.NewFromInt(15)},
	}
	require.NoError(t, db.Create(&prices).Error)

	timeline := computeOverviewTimeline(db, []posting.Posting{{
		Date:      today.AddDate(0, 0, -2),
		Account:   "Liabilities:BondLoan",
		Commodity: "BOND",
		Quantity:  decimal.NewFromInt(-10),
		Amount:    decimal.NewFromInt(-100),
	}})

	require.Len(t, timeline, 3)
	assert.Equal(t, "0", timeline[0].InterestAmount.String())
	assert.Equal(t, "20", timeline[1].InterestAmount.String())
	assert.Equal(t, "50", timeline[2].InterestAmount.String())
}
