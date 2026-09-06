package goal

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestGoalContracts(t *testing.T) {
	require.NoError(t, config.LoadConfig([]byte(`journal_path: main.ledger
db_path: paisa.db
goals:
  savings:
    - name: House
      icon: ''
      target: 60000
      target_date: '2027-03-31'
      rate: 7
      accounts: ['Assets:Goal:*']
    - name: Empty
      icon: ''
      target: 10000
      accounts: ['Assets:Missing:*']
  retirement:
    - name: Retirement
      icon: ''
      swr: 4
      yearly_expenses: 4800
      savings: ['Assets:Goal:*']
    - name: Historical
      icon: ''
      swr: 4
      savings: ['Assets:Goal:*']
      expenses: ['Expenses:*']
`), ""))
	oldNow := utils.Now().Format("2006-01-02")
	utils.SetNow("2026-09-05")
	t.Cleanup(func() {
		utils.SetNow(oldNow)
		service.ClearPriceCache()
		service.ClearInterestCache()
		transaction.ClearCache()
	})
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}, &price.Price{}))
	posts := []posting.Posting{
		{Account: "Assets:Goal:Bank", Date: time.Date(2026, 6, 1, 0, 0, 0, 0, time.Local), Commodity: "INR", Amount: decimal.NewFromInt(10000), Quantity: decimal.NewFromInt(10000)},
		{Account: "Expenses:Food", Date: time.Date(2026, 6, 1, 0, 0, 0, 0, time.Local), Commodity: "INR", Amount: decimal.NewFromInt(6000)},
	}
	require.NoError(t, db.Create(&posts).Error)
	summaries := GetGoalSummaries(db)
	require.Len(t, summaries, 4)
	require.Equal(t, "120000", summaries[0].Target.String())
	require.Equal(t, "configured", summaries[0].YearlyExpenseSource)
	require.Equal(t, "75000", summaries[1].Target.String())
	require.Equal(t, "historical", summaries[1].YearlyExpenseSource)
	require.Equal(t, "10000", summaries[2].Current.String())
	require.Equal(t, 7.0, summaries[2].Rate)
	require.Len(t, summaries[2].ContributionHistory, 3)
	require.Equal(t, "0", summaries[2].ContributionHistory[1].Amount.String())
	require.Empty(t, summaries[3].ContributionHistory)
	detail := GetGoalDetails(db, "savings", "House")
	require.Equal(t, summaries[2].ContributionHistory, detail["contributionHistory"])
	raw, err := json.Marshal(summaries)
	require.NoError(t, err)
	require.Contains(t, string(raw), "contributionHistory")
	require.Equal(t, summaries[0].Target, GetGoalDetails(db, "retirement", "Retirement")["target"])
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\n"), ""))
	require.Empty(t, GetGoalSummaries(db))
}

func TestRetirementTargetGuards(t *testing.T) {
	require.True(t, retirementTarget(decimal.NewFromInt(480000), 4).Equal(decimal.NewFromInt(12000000)))
	for _, swr := range []float64{0, -1} {
		require.True(t, retirementTarget(decimal.NewFromInt(480000), swr).IsZero())
	}
}
