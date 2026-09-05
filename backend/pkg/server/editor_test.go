package server

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupEditorTest(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")
	_ = os.WriteFile(journalPath, []byte(""), 0o600)
	cfgContent := fmt.Sprintf("journal_path: %s\ndb_path: %s\nlocale: en-US\n", journalPath, dbPath)
	require.NoError(t, config.LoadConfig([]byte(cfgContent), cfgPath))
}

func TestGetFilesSortsEditorMetadata(t *testing.T) {
	setupEditorTest(t)
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "editor.db")), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}))
	require.NoError(t, db.Create([]posting.Posting{
		{Account: "Income:Salary", Commodity: "USD", Payee: "Salary"},
		{Account: "Assets:Checking", Commodity: "INR", Payee: "Opening balance"},
		{Account: "Expenses:Rent", Commodity: "EUR", Payee: "Rent"},
	}).Error)

	files := GetFiles(db)
	require.Equal(t, []string{"Assets:Checking", "Expenses:Rent", "Income:Salary"}, files.Accounts)
	require.Equal(t, []string{"EUR", "INR", "USD"}, files.Commodities)
}

func TestValidateFile(t *testing.T) {
	setupEditorTest(t)
	testJournal := `
2022/01/01 Test
    Assets:Checking    100 INR
    Income:Salary     -100 INR
`
	errors, output, err := validateFile(LedgerFile{Name: "test.ledger", Content: testJournal})
	require.NoError(t, err)
	require.Empty(t, errors)
	require.Contains(t, output, "Assets:Checking")
}

func TestValidateFile_MultiCommodityLongName(t *testing.T) {
	setupEditorTest(t)
	testJournal := `
2026/01/01 Test
    Assets:Checking:BankA                       1000.00 INR
    Assets:Debt:MF:VeryLongFundCommodityName      10.000 VeryLongFundCommodityName @ 3500 INR
    Equity:Opening Balances
`
	errors, output, err := validateFile(LedgerFile{Name: "test.ledger", Content: testJournal})
	require.NoError(t, err)
	require.Empty(t, errors)
	require.Contains(t, output, "Assets")
	require.Contains(t, output, "Checking:BankA")
	require.Contains(t, output, "Debt:MF:VeryLongFundCommodityName")
}

func TestSaveFileRejectsChangedRecurringSource(t *testing.T) {
	setupEditorTest(t)
	current := "2026/06/08 Netflix\n    Expenses:Entertainment  499 INR\n    Assets:Bank\n"
	require.NoError(t, os.WriteFile(config.GetJournalPath(), []byte(current), 0o600))
	stale := "old content"
	result := SaveFile(nil, LedgerFile{Name: "main.ledger", Content: "replacement", ExpectedContent: &stale})
	require.Equal(t, false, result["saved"])
	require.Contains(t, result["message"], "changed")
	actual, err := os.ReadFile(config.GetJournalPath())
	require.NoError(t, err)
	require.Equal(t, current, string(actual))
}

func TestRecurringConfirmationSurvivesReload(t *testing.T) {
	previousNow, wasDefined := utils.Now(), utils.IsNowDefined()
	utils.SetNow("2026-08-10")
	t.Cleanup(func() {
		if wasDefined {
			utils.SetNow(previousNow.Format("2006-01-02"))
		} else {
			utils.ResetNow()
		}
	})
	db, _, path := setupIntegrityTestEnv(t)
	original, err := os.ReadFile(path)
	require.NoError(t, err)
	expected := string(original)
	content := "2024/06/08 Netflix\n    ; Recurring: netflix [123456]\n    Expenses:Entertainment  499 INR\n    Assets:Checking\n\n2024/07/08 Netflix\n    ; Recurring: netflix [123456]\n    Expenses:Entertainment  499 INR\n    Assets:Checking\n\n2024/08/08 Netflix\n    ; Recurring: netflix [123456]\n    Expenses:Entertainment  649 INR\n    Assets:Checking\n"
	result := SaveFile(db, LedgerFile{Name: "main.ledger", Content: content, ExpectedContent: &expected})
	require.Equal(t, true, result["saved"], result)
	require.Equal(t, true, result["synced"], result)
	first := GetRecurringTransactions(db)
	require.Len(t, first.TransactionSequences, 1)
	require.Equal(t, "netflix [123456]", first.TransactionSequences[0].Key)
	require.Len(t, first.TransactionSequences[0].Transactions, 3)
	require.True(t, Sync(db, SyncRequest{Journal: true}).Success)
	reloaded := GetRecurringTransactions(db)
	require.Len(t, reloaded.TransactionSequences, 1)
	require.Equal(t, first.TransactionSequences[0].Key, reloaded.TransactionSequences[0].Key)
	require.Equal(t, first.TransactionSequences[0].Interval, reloaded.TransactionSequences[0].Interval)
	for i, tx := range reloaded.TransactionSequences[0].Transactions {
		require.Equal(t, first.TransactionSequences[0].Transactions[i].ID, tx.ID)
		require.Equal(t, "netflix [123456]", tx.TagRecurring)
	}
	actual, err := os.ReadFile(path)
	require.NoError(t, err)
	require.Equal(t, content, string(actual))
	// Retrying with the old revision must fail, not silently overwrite the saved tag.
	require.Equal(t, false, SaveFile(db, LedgerFile{Name: "main.ledger", Content: expected, ExpectedContent: &expected})["saved"])
}
