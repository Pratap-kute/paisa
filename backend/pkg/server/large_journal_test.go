package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestLargeJournal_SyncAndQueryIntegrity(t *testing.T) {
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")

	// 1. Generate 5,000 deterministic postings
	numPostings := 5000
	journalContent := model.GenerateSyntheticJournal(numPostings)
	require.NoError(t, os.WriteFile(journalPath, []byte(journalContent), 0o600))

	cfgContent := fmt.Sprintf("journal_path: %s\ndb_path: %s\nlocale: en-US\n", journalPath, dbPath)
	require.NoError(t, os.WriteFile(cfgPath, []byte(cfgContent), 0o600))
	require.NoError(t, config.LoadConfig([]byte(cfgContent), cfgPath))

	t.Cleanup(func() {
		defaultJournal := filepath.Join(os.TempDir(), "paisa-test-journal.ledger")
		_ = os.WriteFile(defaultJournal, []byte(""), 0o600)
		_ = config.LoadConfig([]byte(fmt.Sprintf("journal_path: %s\n", defaultJournal)), "")
	})

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Discard,
	})
	require.NoError(t, err)

	// 2. Direct Sync via model.SyncJournal
	errMsg, err := model.SyncJournal(db)
	require.NoError(t, err, "SyncJournal should succeed: %s", errMsg)

	// 3. Verify total row count
	var totalCount int64
	require.NoError(t, db.Model(&posting.Posting{}).Count(&totalCount).Error)
	assert.Equal(t, int64(numPostings), totalCount)

	// 4. Test query execution over the large dataset
	expenses := query.Init(db).AccountPrefix("Expenses").All()
	assert.NotEmpty(t, expenses)

	incomes := query.Init(db).AccountPrefix("Income").All()
	assert.NotEmpty(t, incomes)

	// 5. Test API endpoints over the large dataset
	router := Build(db, false)

	// Ping
	wPing := httptest.NewRecorder()
	reqPing, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	router.ServeHTTP(wPing, reqPing)
	assert.Equal(t, http.StatusOK, wPing.Code)

	// Dashboard
	wDash := httptest.NewRecorder()
	reqDash, _ := http.NewRequest(http.MethodGet, "/api/dashboard", nil)
	router.ServeHTTP(wDash, reqDash)
	assert.Equal(t, http.StatusOK, wDash.Code)

	var dashResp map[string]any
	err = json.Unmarshal(wDash.Body.Bytes(), &dashResp)
	require.NoError(t, err)

	// Networth
	wNet := httptest.NewRecorder()
	reqNet, _ := http.NewRequest(http.MethodGet, "/api/networth", nil)
	router.ServeHTTP(wNet, reqNet)
	assert.Equal(t, http.StatusOK, wNet.Code)
}
