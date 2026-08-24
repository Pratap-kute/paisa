package server

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/stretchr/testify/require"
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
