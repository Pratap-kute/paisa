package server

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValidateFile(t *testing.T) {
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
