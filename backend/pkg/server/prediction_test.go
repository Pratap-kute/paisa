package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPredictionTestRouter(t *testing.T, readonly bool) (*gin.Engine, string) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")

	require.NoError(t, os.WriteFile(journalPath, []byte(""), 0o600))
	readonlyStr := "false"
	if readonly {
		readonlyStr = "true"
	}
	cfgContent := fmt.Sprintf("journal_path: %s\ndb_path: %s\nreadonly: %s\nlocale: en-US\n", journalPath, dbPath, readonlyStr)
	require.NoError(t, os.WriteFile(cfgPath, []byte(cfgContent), 0o600))
	require.NoError(t, config.LoadConfig([]byte(cfgContent), cfgPath))
	t.Cleanup(func() {
		defaultJournal := filepath.Join(os.TempDir(), "paisa-test-journal.ledger")
		_ = os.WriteFile(defaultJournal, []byte(""), 0o600)
		_ = config.LoadConfig([]byte(fmt.Sprintf("journal_path: %s\n", defaultJournal)), "")
	})

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	require.NoError(t, err)

	router := Build(db, false)
	return router, cfgPath
}

func TestUpsertMerchantRuleHandler_SuccessAndGrouping(t *testing.T) {
	router, _ := setupPredictionTestRouter(t, false)

	// 1. Create initial rule
	reqBody, err := json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "blinkit",
		Account:  "Expenses:Groceries",
	})
	require.NoError(t, err)

	req, _ := http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp1 dto.MerchantRuleSaveResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp1))
	assert.True(t, resp1.Saved)
	assert.Equal(t, "Expenses:Groceries", resp1.Rule.Account)
	assert.Equal(t, []string{"blinkit"}, resp1.Rule.Merchants)

	// 2. Add second merchant to same account (grouped)
	reqBody, err = json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "zepto",
		Account:  "Expenses:Groceries",
	})
	require.NoError(t, err)

	req, _ = http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp2 dto.MerchantRuleSaveResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp2))
	assert.True(t, resp2.Saved)
	assert.Equal(t, "Expenses:Groceries", resp2.Rule.Account)
	assert.Equal(t, []string{"blinkit", "zepto"}, resp2.Rule.Merchants)

	// Verify persistence in config
	cfg := config.GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, []string{"blinkit", "zepto"}, cfg.Prediction.MerchantRules[0].Merchants)
}

func TestUpsertMerchantRuleHandler_PrefixHandling(t *testing.T) {
	router, _ := setupPredictionTestRouter(t, false)

	reqBody, err := json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "swiggy",
		Account:  "Food",
		Prefix:   "Expenses",
	})
	require.NoError(t, err)

	req, _ := http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp dto.MerchantRuleSaveResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.True(t, resp.Saved)
	assert.Equal(t, "Expenses:Food", resp.Rule.Account)
	assert.Equal(t, []string{"swiggy"}, resp.Rule.Merchants)
}

func TestUpsertMerchantRuleHandler_ValidationErrors(t *testing.T) {
	router, _ := setupPredictionTestRouter(t, false)

	// Missing merchant
	reqBody, _ := json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "",
		Account:  "Expenses:Groceries",
	})
	req, _ := http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Missing account
	reqBody, _ = json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "blinkit",
		Account:  "",
	})
	req, _ = http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Invalid JSON
	req, _ = http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader([]byte("{invalid-json")))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpsertMerchantRuleHandler_ReadonlyMode(t *testing.T) {
	router, _ := setupPredictionTestRouter(t, true)

	reqBody, _ := json.Marshal(dto.MerchantRuleUpsertRequest{
		Merchant: "blinkit",
		Account:  "Expenses:Groceries",
	})
	req, _ := http.NewRequest(http.MethodPost, "/api/prediction/merchant-rule", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
	var resp dto.ErrorResponse
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "READONLY_MODE", resp.Error)
}
