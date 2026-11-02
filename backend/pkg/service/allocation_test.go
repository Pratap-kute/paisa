package service

import (
	"testing"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The allocation is a "current value" view like the balance and net worth pages,
// so a posting dated after today is not part of it.
func TestAllocationIgnoresPostingsDatedAfterToday(t *testing.T) {
	db := serviceTestDB(t)
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)

	postings := []posting.Posting{
		performancePost("deposit", "2026-09-01", "Assets:Checking", "INR", 1000, 1000),
		performancePost("later", "2026-09-10", "Assets:Checking", "INR", -400, -400),
	}
	require.NoError(t, db.Create(&postings).Error)

	summary := GetAllocationSummary(db)
	assert.Equal(t, "1000", summary.TotalMarketAmount.String(), "the withdrawal dated 10 Sep has not happened on 6 Sep")
}
