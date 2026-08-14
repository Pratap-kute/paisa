package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/model/transaction"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func serverTestDB(t *testing.T, readonly bool) *gorm.DB {
	t.Helper()
	configYAML := fmt.Sprintf("journal_path: main.ledger\ndb_path: paisa.db\nreadonly: %t\n", readonly)
	require.NoError(t, config.LoadConfig([]byte(configYAML), ""))
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}, &price.Price{}))
	accounting.ClearCache()
	service.ClearPriceCache()
	service.ClearInterestCache()
	transaction.ClearCache()
	t.Cleanup(func() {
		accounting.ClearCache()
		service.ClearPriceCache()
		service.ClearInterestCache()
		transaction.ClearCache()
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

func serverPosting(account, commodity, quantity, amount string) posting.Posting {
	return posting.Posting{
		TransactionID: account + amount, Date: time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
		Account: account, Commodity: commodity, Quantity: decimal.RequireFromString(quantity),
		Amount: decimal.RequireFromString(amount), MarketAmount: decimal.RequireFromString(amount),
	}
}

func TestGoldenNetworthScenarios(t *testing.T) {
	utils.SetNow("2024-02-01")
	tests := []struct {
		name       string
		postings   []posting.Posting
		investment string
		withdrawal string
		balance    string
		gain       string
	}{
		{
			name:       "cash investment",
			postings:   []posting.Posting{serverPosting("Assets:Checking:Bank", "INR", "100", "100")},
			investment: "100", balance: "100", gain: "0",
		},
		{
			name:       "partial withdrawal",
			postings:   []posting.Posting{serverPosting("Assets:Checking:Bank", "INR", "100", "100"), serverPosting("Assets:Checking:Bank", "INR", "-30", "-30")},
			investment: "100", withdrawal: "30", balance: "70", gain: "0",
		},
		{
			name:       "realized capital gain",
			postings:   []posting.Posting{serverPosting("Assets:Checking:Broker", "INR", "100", "100"), serverPosting("Income:CapitalGains:Checking:Broker", "INR", "-20", "-20")},
			investment: "100", withdrawal: "20", balance: "100", gain: "20",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := serverTestDB(t, false)
			got := computeNetworth(db, tt.postings)
			assert.Equal(t, tt.investment, got.InvestmentAmount.String())
			assert.True(t, decimal.RequireFromString(defaultZero(tt.withdrawal)).Equal(got.WithdrawalAmount), "withdrawal: %s", got.WithdrawalAmount)
			assert.Equal(t, tt.balance, got.BalanceAmount.String())
			assert.Equal(t, tt.gain, got.GainAmount.String())
		})
	}
}

func defaultZero(value string) string {
	if value == "" {
		return "0"
	}
	return value
}

func performRequest(router http.Handler, method, path, body string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	router.ServeHTTP(recorder, req)
	return recorder
}

func TestHTTPContracts(t *testing.T) {
	t.Run("ping", func(t *testing.T) {
		router := Build(serverTestDB(t, false), false)
		response := performRequest(router, http.MethodGet, "/api/ping", "")
		assert.Equal(t, http.StatusOK, response.Code)
		assert.JSONEq(t, `{"success":true}`, response.Body.String())
	})

	t.Run("sync rejects malformed JSON", func(t *testing.T) {
		router := Build(serverTestDB(t, false), false)
		response := performRequest(router, http.MethodPost, "/api/sync", `{`)
		assert.Equal(t, http.StatusBadRequest, response.Code)
		var body map[string]any
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
		assert.NotEmpty(t, body["error"])
	})

	t.Run("readonly sync is a no-op", func(t *testing.T) {
		router := Build(serverTestDB(t, true), false)
		response := performRequest(router, http.MethodPost, "/api/sync", `{`)
		assert.Equal(t, http.StatusOK, response.Code)
		assert.JSONEq(t, `{"success":true}`, response.Body.String())
	})

	t.Run("transaction endpoint returns database rows", func(t *testing.T) {
		db := serverTestDB(t, false)
		row := serverPosting("Expenses:Food", "INR", "-25", "-25")
		row.TransactionID = "txn-1"
		require.NoError(t, db.Create(&row).Error)
		response := performRequest(Build(db, false), http.MethodGet, "/api/transaction", "")
		assert.Equal(t, http.StatusOK, response.Code)
		var body struct {
			Transactions []transaction.Transaction `json:"transactions"`
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &body))
		require.Len(t, body.Transactions, 1)
		assert.Equal(t, "txn-1", body.Transactions[0].ID)
	})
}
