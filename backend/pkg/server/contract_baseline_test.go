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
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupBaselineTestServer(t *testing.T) (*gorm.DB, http.Handler) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "baseline.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")

	journalContent := model.GenerateSyntheticJournal(100)
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
	errMsg, err := model.SyncJournal(db)
	require.NoError(t, err, "SyncJournal failed: %s", errMsg)

	router := Build(db, false)
	return db, router
}

func executeGet(handler http.Handler, path string) (*httptest.ResponseRecorder, map[string]any, error) {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, path, nil)
	handler.ServeHTTP(w, req)

	var body map[string]any
	err := json.Unmarshal(w.Body.Bytes(), &body)
	return w, body, err
}

func TestBaselineContract_FreezePrimaryEndpoints(t *testing.T) {
	utils.SetNow("2024-02-15")
	_, router := setupBaselineTestServer(t)

	t.Run("GET /api/transaction", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/transaction")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		require.Contains(t, body, "transactions")

		txList, ok := body["transactions"].([]any)
		require.True(t, ok)
		require.NotEmpty(t, txList)

		firstTx := txList[0].(map[string]any)
		// Check exact field names and casing
		assert.Contains(t, firstTx, "id")
		assert.Contains(t, firstTx, "date")
		assert.Contains(t, firstTx, "payee")
		assert.Contains(t, firstTx, "postings")
		assert.Contains(t, firstTx, "tag_recurring")
		assert.Contains(t, firstTx, "tag_period")
		assert.Contains(t, firstTx, "beginLine")
		assert.Contains(t, firstTx, "endLine")
		assert.Contains(t, firstTx, "fileName")
		assert.Contains(t, firstTx, "note")

		postings := firstTx["postings"].([]any)
		require.NotEmpty(t, postings)
		firstPosting := postings[0].(map[string]any)
		assert.Contains(t, firstPosting, "id")
		assert.Contains(t, firstPosting, "transaction_id")
		assert.Contains(t, firstPosting, "date")
		assert.Contains(t, firstPosting, "payee")
		assert.Contains(t, firstPosting, "account")
		assert.Contains(t, firstPosting, "commodity")
		assert.Contains(t, firstPosting, "quantity")
		assert.Contains(t, firstPosting, "amount")
		assert.Contains(t, firstPosting, "status")
		assert.Contains(t, firstPosting, "tag_recurring")
		assert.Contains(t, firstPosting, "tag_period")
		assert.Contains(t, firstPosting, "transaction_begin_line")
		assert.Contains(t, firstPosting, "transaction_end_line")
		assert.Contains(t, firstPosting, "file_name")
		assert.Contains(t, firstPosting, "forecast")
		assert.Contains(t, firstPosting, "note")
		assert.Contains(t, firstPosting, "transaction_note")
		assert.Contains(t, firstPosting, "market_amount")
		assert.Contains(t, firstPosting, "balance")
	})

	t.Run("GET /api/transaction/balanced", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/transaction/balanced")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		require.Contains(t, body, "balancedPostings")
		posts, ok := body["balancedPostings"].([]any)
		require.True(t, ok)
		require.NotEmpty(t, posts)
	})

	t.Run("GET /api/networth", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/networth")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "networthTimeline")
		assert.Contains(t, body, "xirr")
	})

	t.Run("GET /api/expense", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/expense")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "expenses")
		assert.Contains(t, body, "month_wise")
		assert.Contains(t, body, "graph")
	})

	t.Run("GET /api/income", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/income")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "income_timeline")
		assert.Contains(t, body, "tax_timeline")
		assert.Contains(t, body, "yearly_cards")
	})

	t.Run("GET /api/cash_flow", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/cash_flow")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "cash_flows")
	})

	t.Run("GET /api/budget", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/budget")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "budgetsByMonth")
		assert.Contains(t, body, "checkingBalance")
		assert.Contains(t, body, "availableForBudgeting")
	})

	t.Run("GET /api/investment", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/investment")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "assets")
		assert.Contains(t, body, "yearly_cards")
	})

	t.Run("GET /api/gain", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/gain")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "gain_breakdown")
	})

	t.Run("GET /api/templates", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/templates")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "templates")
	})

	t.Run("GET /api/config", func(t *testing.T) {
		w, body, err := executeGet(router, "/api/config")
		require.NoError(t, err)
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, body, "config")
		assert.Contains(t, body, "accounts")
		assert.Contains(t, body, "now")
		assert.Contains(t, body, "schema")
	})
}
