package config

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadConfigValid(t *testing.T) {
	validYAML := `
journal_path: /path/to/main.ledger
db_path: /path/to/paisa.db
default_currency: INR
time_zone: Asia/Kolkata
display_precision: 2
commodities:
  - name: NIFTY50
    type: stock
    price:
      provider: com-yahoo
      code: ^NSEI
`
	err := LoadConfig([]byte(validYAML), "/tmp/paisa.yaml")
	require.NoError(t, err)

	assert.Equal(t, "/path/to/main.ledger", GetJournalPath())
	assert.Equal(t, "/path/to/paisa.db", GetDBPath())
	assert.Equal(t, "INR", DefaultCurrency())
	assert.Equal(t, "Asia/Kolkata", TimeZone().String())

	cfg := GetConfig()
	assert.Equal(t, 2, cfg.DisplayPrecision)
	require.Len(t, cfg.Commodities, 1)
	assert.Equal(t, "NIFTY50", cfg.Commodities[0].Name)
}

func TestLoadConfigDefaultValues(t *testing.T) {
	minimalYAML := `
journal_path: ledger.txt
db_path: test.db
`
	err := LoadConfig([]byte(minimalYAML), "/tmp/paisa.yaml")
	require.NoError(t, err)

	// Defaults should be applied
	assert.Equal(t, "INR", DefaultCurrency())
	assert.Equal(t, 0, GetConfig().DisplayPrecision)
	assert.Equal(t, 52, GetConfig().AmountAlignmentColumn)
	assert.Equal(t, "en-IN", GetConfig().Locale)
}

func TestLoadConfigInvalidSchema(t *testing.T) {
	tests := []struct {
		name string
		yaml string
	}{
		{
			name: "missing required journal_path",
			yaml: `db_path: test.db`,
		},
		{
			name: "invalid type for display_precision",
			yaml: `
journal_path: main.ledger
db_path: paisa.db
display_precision: "not-a-number"
`,
		},
		{
			name: "duplicate commodity names violates itemsUniqueProperties",
			yaml: `
journal_path: main.ledger
db_path: paisa.db
commodities:
  - name: AAPL
    type: stock
  - name: AAPL
    type: stock
`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := LoadConfig([]byte(tt.yaml), "")
			assert.Error(t, err)
		})
	}
}

func TestLoadConfigInvalidTimezone(t *testing.T) {
	invalidTZ := `
journal_path: main.ledger
db_path: paisa.db
time_zone: Invalid/Non_Existent_Timezone
`
	err := LoadConfig([]byte(invalidTZ), "")
	assert.Error(t, err)
}

func TestConfigPathResolution(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "paisa.yaml")

	yaml := `
journal_path: relative/main.ledger
db_path: relative/paisa.db
sheets_directory: relative/sheets
`
	err := LoadConfig([]byte(yaml), configPath)
	require.NoError(t, err)

	assert.Equal(t, filepath.Join(tempDir, "relative/main.ledger"), GetJournalPath())
	assert.Equal(t, filepath.Join(tempDir, "relative/paisa.db"), GetDBPath())
	assert.Equal(t, filepath.Join(tempDir, "relative/sheets"), GetSheetDir())
}
