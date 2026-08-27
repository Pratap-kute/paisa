package server

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupIntegrityTestEnv(t *testing.T) (*gorm.DB, string, string) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	configPath := filepath.Join(dir, "paisa.yaml")

	initialJournal := `2024-01-01 * Opening Balance
    Assets:Checking  1000 INR
    Equity:Opening  -1000 INR
`
	require.NoError(t, os.WriteFile(journalPath, []byte(initialJournal), 0o644))

	cfgContent := fmt.Sprintf("journal_path: %s\ndb_path: %s\n", journalPath, dbPath)
	require.NoError(t, os.WriteFile(configPath, []byte(cfgContent), 0o600))
	require.NoError(t, config.LoadConfig([]byte(cfgContent), configPath))

	db, err := database.InitializePath(context.Background(), dbPath)
	require.NoError(t, err)

	syncRes := Sync(db, SyncRequest{Journal: true})
	require.True(t, syncRes.Success, "Initial sync should succeed: %s", syncRes.Message)

	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
	})

	return db, dir, journalPath
}

func TestSaveFile_ValidationFailure(t *testing.T) {
	db, dir, journalPath := setupIntegrityTestEnv(t)

	initialContent, err := os.ReadFile(journalPath)
	require.NoError(t, err)

	invalidContent := `2024-01-02 * Invalid Transaction with unbalanced posting
    Assets:Checking  500 INR
`
	res := SaveFile(db, LedgerFile{
		Name:    "main.ledger",
		Content: invalidContent,
	})

	assert.Equal(t, false, res["saved"])
	assert.Equal(t, false, res["synced"])
	assert.NotEmpty(t, res["message"])

	// Durable file must remain completely unchanged
	afterContent, err := os.ReadFile(journalPath)
	require.NoError(t, err)
	assert.Equal(t, string(initialContent), string(afterContent))

	// Verify no stray temp files
	tempFiles, err := filepath.Glob(filepath.Join(dir, ".paisa-tmp-*"))
	require.NoError(t, err)
	assert.Empty(t, tempFiles)
}

func TestSaveFile_SuccessfulSaveAndSync(t *testing.T) {
	db, dir, journalPath := setupIntegrityTestEnv(t)

	validContent := `2024-01-01 * Opening Balance
    Assets:Checking  1000 INR
    Equity:Opening  -1000 INR

2024-01-05 * Grocery Store
    Expenses:Food   250 INR
    Assets:Checking -250 INR
`
	res := SaveFile(db, LedgerFile{
		Name:    "main.ledger",
		Content: validContent,
	})

	assert.Equal(t, true, res["saved"])
	assert.Equal(t, true, res["synced"])
	assert.Empty(t, res["errors"])

	// Durable file must contain new content
	afterContent, err := os.ReadFile(journalPath)
	require.NoError(t, err)
	assert.Equal(t, validContent, string(afterContent))

	// Backup file must exist
	backups, err := filepath.Glob(filepath.Join(dir, "main.ledger.backup.*"))
	require.NoError(t, err)
	assert.NotEmpty(t, backups)

	// Database must have newly synced postings
	var count int64
	require.NoError(t, db.Model(&posting.Posting{}).Count(&count).Error)
	assert.Equal(t, int64(4), count) // 2 opening + 2 grocery
}

func TestSaveFile_SyncFailureAfterSuccessfulSave(t *testing.T) {
	db, _, journalPath := setupIntegrityTestEnv(t)

	// Prepare content that passes validateFile (syntax is fine) but has a valid transaction
	validNewContent := `2024-01-01 * Opening Balance
    Assets:Checking  1000 INR
    Equity:Opening  -1000 INR

2024-01-10 * Coffee
    Expenses:Coffee  50 INR
    Assets:Checking -50 INR
`
	// Close DB to simulate a database failure during sync
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	res := SaveFile(db, LedgerFile{
		Name:    "main.ledger",
		Content: validNewContent,
	})

	// File was saved durably, but sync failed
	assert.Equal(t, true, res["saved"], "Journal file was saved")
	assert.Equal(t, false, res["synced"], "Sync failed due to closed DB")
	assert.Contains(t, res["message"], "sync failed")

	// The journal file MUST remain the durable source of truth with the new content
	savedContent, err := os.ReadFile(journalPath)
	require.NoError(t, err)
	assert.Equal(t, validNewContent, string(savedContent))
}

func TestSaveFile_TempFileCleanup(t *testing.T) {
	db, dir, _ := setupIntegrityTestEnv(t)

	// Attempt multiple saves (some successful, some invalid)
	for i := range 5 {
		_ = SaveFile(db, LedgerFile{
			Name:    "main.ledger",
			Content: fmt.Sprintf("invalid syntax line %d", i),
		})
	}

	tempFiles, err := filepath.Glob(filepath.Join(dir, ".paisa-tmp-*"))
	require.NoError(t, err)
	assert.Empty(t, tempFiles)
}

func TestConfigSave_Integrity(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "paisa.yaml")

	validConfig := `journal_path: main.ledger
db_path: paisa.db
default_currency: INR
time_zone: Asia/Kolkata
`
	require.NoError(t, os.WriteFile(configPath, []byte(validConfig), 0o600))
	require.NoError(t, config.LoadConfig([]byte(validConfig), configPath))

	origCurrency := config.DefaultCurrency()
	assert.Equal(t, "INR", origCurrency)

	// Attempt saving invalid config (bad schema)
	invalidConfig := `journal_path: 12345
db_path: []
`
	err := config.SaveConfig([]byte(invalidConfig))
	assert.Error(t, err)

	// Global config must remain unchanged
	assert.Equal(t, "INR", config.DefaultCurrency())
	assert.Equal(t, "Asia/Kolkata", config.TimeZone().String())

	// File on disk must remain unchanged
	content, err := os.ReadFile(configPath)
	require.NoError(t, err)
	assert.Contains(t, string(content), "default_currency: INR")

	// Save valid new config
	newConfig := `journal_path: main.ledger
db_path: paisa.db
default_currency: USD
time_zone: America/New_York
`
	err = config.SaveConfig([]byte(newConfig))
	require.NoError(t, err)

	// Global config now updated
	assert.Equal(t, "USD", config.DefaultCurrency())
	assert.Equal(t, "America/New_York", config.TimeZone().String())

	// File on disk updated
	content2, err := os.ReadFile(configPath)
	require.NoError(t, err)
	assert.Contains(t, string(content2), "default_currency: USD")
}

func TestSyncJournal_DBTransactionRollback(t *testing.T) {
	db, _, _ := setupIntegrityTestEnv(t)

	// Seed an initial price and posting
	d1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	require.NoError(t, db.Create(&price.Price{
		CommodityName: "INITIAL",
		CommodityType: config.Unknown,
		Date:          d1,
	}).Error)

	var initialPriceCount int64
	require.NoError(t, db.Model(&price.Price{}).Count(&initialPriceCount).Error)
	assert.Equal(t, int64(1), initialPriceCount)

	// Perform a simulated transaction where postings update fails after prices
	err := db.Transaction(func(tx *gorm.DB) error {
		pErr := price.UpsertAllByType(tx, config.Unknown, []price.Price{
			{CommodityName: "NEW_PRICE", CommodityType: config.Unknown, Date: d1},
		})
		if pErr != nil {
			return pErr
		}
		// Force posting error
		return fmt.Errorf("simulated posting failure")
	})
	assert.Error(t, err)

	// Verify price changes rolled back
	var afterPriceCount int64
	require.NoError(t, db.Model(&price.Price{}).Count(&afterPriceCount).Error)
	assert.Equal(t, initialPriceCount, afterPriceCount)

	var remainingPrice price.Price
	require.NoError(t, db.First(&remainingPrice).Error)
	assert.Equal(t, "INITIAL", remainingPrice.CommodityName)
}
