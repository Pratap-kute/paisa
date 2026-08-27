package server

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/template"
	"github.com/ananthakumaran/paisa/pkg/scraper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestRuntimeResilience_UnknownPriceProvider(t *testing.T) {
	// Must return nil and not panic or log.Fatal
	provider := scraper.GetProviderByCode("non-existent-provider-code")
	assert.Nil(t, provider)
}

func TestRuntimeResilience_MissingCommodityPriceLookup(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	// Price lookup for commodity that does not exist in db
	d1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	unitPrice := service.GetUnitPrice(db, "NON_EXISTENT_CO", d1)
	assert.True(t, unitPrice.Value.IsZero(), "Should return zero price without fatal crash")

	allPrices := service.GetAllPrices(db, "NON_EXISTENT_CO")
	assert.Empty(t, allPrices, "Should return empty list without fatal crash")
}

func TestRuntimeResilience_TemplateOperations(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "paisa.yaml")
	cfgContent := "journal_path: main.ledger\ndb_path: paisa.db\nlocale: en-US\n"
	require.NoError(t, os.WriteFile(configPath, []byte(cfgContent), 0o600))
	require.NoError(t, config.LoadConfig([]byte(cfgContent), configPath))

	// Template All must return slice without crashing
	templates := template.All()
	assert.NotEmpty(t, templates)

	// Upsert valid template
	tpl, err := template.Upsert("test_template", "account: Assets:Checking")
	require.NoError(t, err)
	assert.Equal(t, "test_template", tpl.Name)

	// Delete template
	err = template.Delete("test_template")
	require.NoError(t, err)
}
