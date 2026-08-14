package generator

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMinimalConfig(t *testing.T) {
	tempDir := t.TempDir()
	err := MinimalConfig(tempDir)
	require.NoError(t, err)

	assert.FileExists(t, filepath.Join(tempDir, "paisa.yaml"))
	assert.FileExists(t, filepath.Join(tempDir, "main.ledger"))
}

func TestGenerateFallbackPrices(t *testing.T) {
	commodities := []struct {
		name     string
		typeCode config.CommodityType
		code     string
	}{
		{name: "NIFTY", typeCode: config.MutualFund, code: "120716"},
		{name: "PPFAS", typeCode: config.MutualFund, code: "122639"},
		{name: "ABCBF", typeCode: config.MutualFund, code: "119533"},
		{name: "NPS_HDFC_E", typeCode: config.NPS, code: "SM008001"},
		{name: "NPS_HDFC_C", typeCode: config.NPS, code: "SM008002"},
		{name: "NPS_HDFC_G", typeCode: config.NPS, code: "SM008003"},
	}

	for _, c := range commodities {
		t.Run(c.name, func(t *testing.T) {
			prices := generateFallbackPrices(c.code, c.typeCode, c.name)
			require.NotEmpty(t, prices)

			// First price should be at StartYear (2014)
			assert.Equal(t, 2014, prices[0].Date.Year())
			assert.True(t, prices[0].Value.IsPositive())

			// Last price should be close to or after current year
			lastPrice := prices[len(prices)-1]
			assert.GreaterOrEqual(t, lastPrice.Date.Year(), time.Now().Year()-1)
			assert.True(t, lastPrice.Value.GreaterThan(prices[0].Value))
		})
	}
}

func TestDemo(t *testing.T) {
	tempDir := t.TempDir()
	err := Demo(tempDir)
	require.NoError(t, err)

	configPath := filepath.Join(tempDir, "paisa.yaml")
	ledgerPath := filepath.Join(tempDir, "main.ledger")
	sheetPath := filepath.Join(tempDir, "Schedule AL.paisa")

	assert.FileExists(t, configPath)
	assert.FileExists(t, ledgerPath)
	assert.FileExists(t, sheetPath)

	ledgerStat, err := os.Stat(ledgerPath)
	require.NoError(t, err)
	assert.Greater(t, ledgerStat.Size(), int64(1000), "Ledger file should contain multiple transactions")
}
