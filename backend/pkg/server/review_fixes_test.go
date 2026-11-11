package server

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/scraper/stock"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

var fastParams = &auth.Params{Memory: 8, Iterations: 1, Parallelism: 1, SaltLength: 16, KeyLength: 32}

func doRequest(router http.Handler, method, path, body string, headers map[string]string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = "203.0.113.5:4444"
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	router.ServeHTTP(w, req)
	return w
}

func migratedDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := database.InitializePath(context.Background(), config.GetDBPath())
	require.NoError(t, err)
	return db
}

func TestSync_FailedPriceFetchStillClearsPriceCache(t *testing.T) {
	setupAuthTestRouter(t, nil)
	db := migratedDB(t)

	closePrice := 100.0
	yahoo := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ts := time.Now().Add(-48 * time.Hour).Unix()
		_, _ = fmt.Fprintf(w, `{"chart":{"result":[{"meta":{"currency":"INR"},"timestamp":[%d],"indicators":{"quote":[{"close":[%f]}]}}]}}`, ts, closePrice)
	}))
	defer yahoo.Close()
	orig := stock.YahooBaseURL
	stock.YahooBaseURL = yahoo.URL
	t.Cleanup(func() { stock.YahooBaseURL = orig })

	cfg := config.GetConfig()
	require.NoError(t, config.SaveConfig([]byte(fmt.Sprintf(`journal_path: %s
db_path: %s
commodities:
  - name: AAPL
    type: stock
    price: {provider: com-yahoo, code: AAPL}
  - name: BAD
    type: stock
    price: {provider: co-alphavantage, code: nope}
`, cfg.JournalPath, cfg.DBPath))))

	service.ClearPriceCache()
	first := Sync(db, SyncRequest{Prices: true})
	require.False(t, first.Success, "BAD has an invalid code, so the sync reports failure")
	require.Equal(t, "100", service.GetUnitPrice(db, "AAPL", time.Now()).Value.String())

	closePrice = 250.0
	second := Sync(db, SyncRequest{Prices: true})
	require.False(t, second.Success)
	assert.Equal(t, "250", service.GetUnitPrice(db, "AAPL", time.Now()).Value.String(),
		"prices written by the commodities that succeeded must be visible after a partly failed sync")
}

func TestAuth_RenamedUserWithoutPasswordKeepsAccess(t *testing.T) {
	hash, err := auth.HashPasswordWithParams("right", fastParams)
	require.NoError(t, err)
	router, _, _ := setupAuthTestRouter(t, []config.UserAccount{{Username: "alice", Password: hash}})
	creds := map[string]string{"X-Auth": "alice:right"}
	cfg := config.GetConfig()

	body := fmt.Sprintf("journal_path: %s\ndb_path: %s\nuser_accounts:\n  - username: bob\n    password: \"\"\n", cfg.JournalPath, cfg.DBPath)
	w := doRequest(router, "POST", "/api/config", body, creds)

	assert.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	assert.Equal(t, http.StatusOK, doRequest(router, "GET", "/api/ping", "", creds).Code, "alice must still be able to log in")
}

func TestAuth_RateLimitIgnoresSpoofedForwardedFor(t *testing.T) {
	hash, err := auth.HashPasswordWithParams("right", fastParams)
	require.NoError(t, err)
	router, _, _ := setupAuthTestRouter(t, []config.UserAccount{{Username: "alice", Password: hash}})

	var codes []int
	for i := range 8 {
		w := doRequest(router, "GET", "/api/ping", "", map[string]string{
			"X-Auth":          "alice:wrong",
			"X-Forwarded-For": fmt.Sprintf("10.0.0.%d", i),
		})
		codes = append(codes, w.Code)
	}
	assert.Contains(t, codes, http.StatusTooManyRequests, "rotating X-Forwarded-For must not reset the limiter: %v", codes)
}

func TestAuth_VerifiedCredentialsAreCached(t *testing.T) {
	hash, err := auth.HashPasswordWithParams("right", fastParams)
	require.NoError(t, err)
	var calls atomic.Int32
	orig := verifyPassword
	verifyPassword = func(stored, supplied string) (bool, bool, error) {
		calls.Add(1)
		return auth.VerifyPassword(stored, supplied)
	}
	t.Cleanup(func() { verifyPassword = orig })
	router, _, _ := setupAuthTestRouter(t, []config.UserAccount{{Username: "alice", Password: hash}})

	for range 5 {
		assert.Equal(t, http.StatusOK, doRequest(router, "GET", "/api/ping", "", map[string]string{"X-Auth": "alice:right"}).Code)
	}
	assert.Equal(t, int32(1), calls.Load(), "Argon2 should run once for repeated identical credentials")
}

func TestAuth_WrongTokenIsNeverCached(t *testing.T) {
	hash, err := auth.HashPasswordWithParams("right", fastParams)
	require.NoError(t, err)
	var calls atomic.Int32
	orig := verifyPassword
	verifyPassword = func(stored, supplied string) (bool, bool, error) {
		calls.Add(1)
		return auth.VerifyPassword(stored, supplied)
	}
	t.Cleanup(func() { verifyPassword = orig })
	router, _, _ := setupAuthTestRouter(t, []config.UserAccount{{Username: "alice", Password: hash}})

	for range 3 {
		assert.Equal(t, http.StatusUnauthorized, doRequest(router, "GET", "/api/ping", "", map[string]string{"X-Auth": "alice:wrong"}).Code)
	}
	assert.Equal(t, int32(3), calls.Load())
}

func TestAuth_CacheDoesNotOutliveACredentialChange(t *testing.T) {
	hash, err := auth.HashPasswordWithParams("right", fastParams)
	require.NoError(t, err)
	router, _, _ := setupAuthTestRouter(t, []config.UserAccount{{Username: "alice", Password: hash}})
	old := map[string]string{"X-Auth": "alice:right"}
	require.Equal(t, http.StatusOK, doRequest(router, "GET", "/api/ping", "", old).Code)

	cfg := config.GetConfig()
	body := fmt.Sprintf("journal_path: %s\ndb_path: %s\nuser_accounts:\n  - username: alice\n    password: \"changed\"\n", cfg.JournalPath, cfg.DBPath)
	require.NoError(t, config.SaveConfig([]byte(body)))

	assert.Equal(t, http.StatusUnauthorized, doRequest(router, "GET", "/api/ping", "", old).Code, "the old password must stop working immediately")
	assert.Equal(t, http.StatusOK, doRequest(router, "GET", "/api/ping", "", map[string]string{"X-Auth": "alice:changed"}).Code)
}

func TestPriceProvider_UnknownProviderIsABadRequest(t *testing.T) {
	router, _, _ := setupAuthTestRouter(t, nil)

	w := doRequest(router, "POST", "/api/price/providers/delete/bogus", "", nil)
	assert.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())

	w = doRequest(router, "POST", "/api/price/autocomplete", `{"provider":"bogus","field":"x","filters":{}}`, nil)
	assert.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
}

func TestAllocation_ZeroTotalDoesNotPanic(t *testing.T) {
	setupAuthTestRouter(t, nil)
	db := migratedDB(t)
	cfg := config.GetConfig()
	require.NoError(t, config.SaveConfig([]byte(fmt.Sprintf(`journal_path: %s
db_path: %s
allocation_targets:
  - name: Equity
    target: 100
    accounts: ["Assets:*"]
`, cfg.JournalPath, cfg.DBPath))))

	d := time.Now().Add(-72 * time.Hour)
	postings := []posting.Posting{
		{Date: d, Account: "Assets:Bank", Commodity: "INR", Quantity: decimal.NewFromInt(100), Amount: decimal.NewFromInt(100), MarketAmount: decimal.NewFromInt(100)},
		{Date: d, Account: "Assets:Bank", Commodity: "INR", Quantity: decimal.NewFromInt(-100), Amount: decimal.NewFromInt(-100), MarketAmount: decimal.NewFromInt(-100)},
	}
	require.NotPanics(t, func() {
		targets := computeAllocationTargets(db, postings)
		require.Len(t, targets, 1)
		assert.True(t, targets[0].Current.IsZero())
	})
}
