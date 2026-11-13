package ledger

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/binary"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLedgerParseSkipsVirtualPostings(t *testing.T) {
	if _, err := binary.LookPath("ledger"); err != nil {
		t.Skip("ledger binary not available")
	}

	dir := t.TempDir()
	journal := filepath.Join(dir, "main.ledger")
	content := `2026/02/03 Salary
    Assets:Bank       100 INR
    Income:Salary

2026/02/04 Earmark
    [Assets:Goals:Car]    50 INR
    [Assets:Bank]        -50 INR
    (Assets:Envelope)     10 INR
    Assets:Bank          -20 INR
    Expenses:Food
`
	require.NoError(t, os.WriteFile(journal, []byte(content), 0o600))
	require.NoError(t, config.LoadConfig([]byte("journal_path: "+journal+"\ndb_path: paisa.db\ndefault_currency: INR\ntime_zone: UTC\n"), ""))

	postings, err := LedgerCLI{}.Parse(journal, nil)
	require.NoError(t, err)

	accounts := []string{}
	for _, p := range postings {
		accounts = append(accounts, p.Account)
	}
	assert.ElementsMatch(t, []string{"Assets:Bank", "Income:Salary", "Assets:Bank", "Expenses:Food"}, accounts)
}
