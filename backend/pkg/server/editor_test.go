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

func TestValidateFile_MultiCommodityLongName(t *testing.T) {
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
