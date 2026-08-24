package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupAuthTestRouter(t *testing.T, userAccounts []config.UserAccount) (*gin.Engine, *gorm.DB, string) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")

	require.NoError(t, os.WriteFile(journalPath, []byte(""), 0o600))

	type minimalConfig struct {
		JournalPath  string               `yaml:"journal_path"`
		DBPath       string               `yaml:"db_path"`
		Locale       string               `yaml:"locale"`
		UserAccounts []config.UserAccount `yaml:"user_accounts"`
	}

	cfg := minimalConfig{
		JournalPath:  journalPath,
		DBPath:       dbPath,
		Locale:       "en-US",
		UserAccounts: userAccounts,
	}

	data, err := yaml.Marshal(cfg)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(cfgPath, data, 0o600))
	require.NoError(t, config.LoadConfig(data, cfgPath))

	t.Cleanup(func() {
		defaultJournal := filepath.Join(os.TempDir(), "paisa-test-journal.ledger")
		_ = os.WriteFile(defaultJournal, []byte(""), 0o600)
		_ = config.LoadConfig([]byte(fmt.Sprintf("journal_path: %s\n", defaultJournal)), "")
	})

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	require.NoError(t, err)

	router := Build(db, false)
	return router, db, cfgPath
}

func computeClientToken(rawPassword string) string {
	return utils.Sha256(rawPassword)
}

func computeLegacyStoredHash(rawPassword string) string {
	inner := utils.Sha256(rawPassword)
	return "sha256:" + utils.Sha256(inner)
}

// TEST 1 — Existing SHA credential still works
func TestAuth_LegacySHACredentialSuccess(t *testing.T) {
	rawPassword := "legacy_secret_123"
	legacyHash := computeLegacyStoredHash(rawPassword)

	accounts := []config.UserAccount{
		{Username: "alice", Password: legacyHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	clientToken := computeClientToken(rawPassword)
	req.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

// TEST 2 — Wrong password against SHA credential
func TestAuth_LegacySHACredentialWrongPassword(t *testing.T) {
	rawPassword := "legacy_secret_123"
	legacyHash := computeLegacyStoredHash(rawPassword)

	accounts := []config.UserAccount{
		{Username: "alice", Password: legacyHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	wrongToken := computeClientToken("incorrect_password")
	req.Header.Set("X-Auth", fmt.Sprintf("alice:%s", wrongToken))
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TEST 3 — Legacy credential migration
func TestAuth_LegacyCredentialOpportunisticMigration(t *testing.T) {
	rawPassword := "migrate_secret_456"
	legacyHash := computeLegacyStoredHash(rawPassword)

	accounts := []config.UserAccount{
		{Username: "alice", Password: legacyHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// 1. Authenticate with legacy password
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	clientToken := computeClientToken(rawPassword)
	req1.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Give background migration a moment to write
	time.Sleep(50 * time.Millisecond)

	// 2. Check stored configuration has been upgraded to Argon2id
	cfg := config.GetConfig()
	require.Len(t, cfg.UserAccounts, 1)
	assert.True(t, strings.HasPrefix(cfg.UserAccounts[0].Password, "$argon2id$"))

	// 3. Authenticate again using the same password against the newly saved Argon2id credential
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req2.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)
}

// TEST 5 & 6 — New password uses Argon2id and unique salts
func TestAuth_NewPasswordUsesArgon2idAndUniqueSalts(t *testing.T) {
	rawPassword := "new_secret_789"
	clientToken := computeClientToken(rawPassword)

	argonHash1, err := auth.HashPassword(clientToken)
	require.NoError(t, err)
	argonHash2, err := auth.HashPassword(clientToken)
	require.NoError(t, err)

	assert.NotEqual(t, argonHash1, argonHash2, "Unique salts must ensure different verifiers for same password")

	accounts := []config.UserAccount{
		{Username: "alice", Password: argonHash1},
		{Username: "bob", Password: argonHash2},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// Both authenticate successfully
	for _, user := range []string{"alice", "bob"} {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
		req.Header.Set("X-Auth", fmt.Sprintf("%s:%s", user, clientToken))
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}
}

// TEST 7 & 8 — Correct vs Incorrect Argon2id password
func TestAuth_Argon2idCorrectAndIncorrect(t *testing.T) {
	clientToken := computeClientToken("correct_pass")
	argonHash, err := auth.HashPassword(clientToken)
	require.NoError(t, err)

	accounts := []config.UserAccount{
		{Username: "alice", Password: argonHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// Correct
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req1.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Incorrect
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req2.Header.Set("X-Auth", fmt.Sprintf("alice:%s", computeClientToken("wrong_pass")))
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusUnauthorized, w2.Code)
}

// TEST 9 — Malformed stored credential
func TestAuth_MalformedStoredCredential(t *testing.T) {
	// 1. Direct auth verifier check
	valid, needsRehash, err := auth.VerifyPassword("corrupted_verifier_without_prefix", "some_token")
	assert.False(t, valid)
	assert.False(t, needsRehash)
	assert.Error(t, err)

	// 2. HTTP router with corrupted argon2 parameters
	accounts := []config.UserAccount{
		{Username: "alice", Password: "$argon2id$v=19$m=0,t=0,p=0$invalid$invalid"},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req.Header.Set("X-Auth", "alice:some_token")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TEST 10 — GET /api/config contains no password verifier
func TestAuth_GetConfigRedactsPasswordVerifiers(t *testing.T) {
	clientToken := computeClientToken("secret_pass")
	argonHash, err := auth.HashPassword(clientToken)
	require.NoError(t, err)

	accounts := []config.UserAccount{
		{Username: "alice", Password: argonHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/config", nil)
	req.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var resp struct {
		Config struct {
			UserAccounts []struct {
				Username string `json:"username"`
				Password string `json:"password"`
			} `json:"user_accounts"`
		} `json:"config"`
	}
	err = json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)

	require.Len(t, resp.Config.UserAccounts, 1)
	assert.Equal(t, "alice", resp.Config.UserAccounts[0].Username)
	assert.Empty(t, resp.Config.UserAccounts[0].Password, "Password verifier must be redacted in GET /api/config")
}

// TEST 11 — Config roundtrip without password change
func TestAuth_ConfigRoundtripPreservesPassword(t *testing.T) {
	clientToken := computeClientToken("my_password")
	argonHash, err := auth.HashPassword(clientToken)
	require.NoError(t, err)

	accounts := []config.UserAccount{
		{Username: "alice", Password: argonHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// 1. GET /api/config
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/api/config", nil)
	req1.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w1, req1)
	require.Equal(t, http.StatusOK, w1.Code)

	var getResp struct {
		Config map[string]interface{} `json:"config"`
	}
	err = json.Unmarshal(w1.Body.Bytes(), &getResp)
	require.NoError(t, err)

	// 2. Modify an unrelated field, leaving password empty/redacted as received
	getResp.Config["display_precision"] = 3
	updatedJSON, err := json.Marshal(getResp.Config)
	require.NoError(t, err)

	// 3. POST /api/config
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(updatedJSON))
	req2.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	req2.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w2, req2)
	require.Equal(t, http.StatusOK, w2.Code)

	// 4. Verify password was preserved and login still works
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req3.Header.Set("X-Auth", fmt.Sprintf("alice:%s", clientToken))
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)
}

// TEST 12 & 13 — Config password change and isolation
func TestAuth_ConfigPasswordChange(t *testing.T) {
	token1 := computeClientToken("old_pass_1")
	hash1, err := auth.HashPassword(token1)
	require.NoError(t, err)

	token2 := computeClientToken("alice_pass_2")
	hash2, err := auth.HashPassword(token2)
	require.NoError(t, err)

	accounts := []config.UserAccount{
		{Username: "user1", Password: hash1},
		{Username: "user2", Password: hash2},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// 1. GET /api/config to get valid baseline config
	wGet := httptest.NewRecorder()
	reqGet, _ := http.NewRequest(http.MethodGet, "/api/config", nil)
	reqGet.Header.Set("X-Auth", fmt.Sprintf("user2:%s", token2))
	router.ServeHTTP(wGet, reqGet)
	require.Equal(t, http.StatusOK, wGet.Code)

	var getResp struct {
		Config map[string]interface{} `json:"config"`
	}
	err = json.Unmarshal(wGet.Body.Bytes(), &getResp)
	require.NoError(t, err)

	// Change user1's password to new_pass_1
	newToken1 := computeClientToken("new_pass_1")
	getResp.Config["user_accounts"] = []map[string]interface{}{
		{"username": "user1", "password": newToken1},
		{"username": "user2", "password": ""}, // user2 unchanged
	}
	cfgJSON, err := json.Marshal(getResp.Config)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(cfgJSON))
	req.Header.Set("X-Auth", fmt.Sprintf("user2:%s", token2))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	// user1 old password fails
	wOld := httptest.NewRecorder()
	reqOld, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	reqOld.Header.Set("X-Auth", fmt.Sprintf("user1:%s", token1))
	router.ServeHTTP(wOld, reqOld)
	assert.Equal(t, http.StatusUnauthorized, wOld.Code)

	// user1 new password succeeds
	wNew := httptest.NewRecorder()
	reqNew, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	reqNew.Header.Set("X-Auth", fmt.Sprintf("user1:%s", newToken1))
	router.ServeHTTP(wNew, reqNew)
	assert.Equal(t, http.StatusOK, wNew.Code)

	// user2 password remains intact and works
	wU2 := httptest.NewRecorder()
	reqU2, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	reqU2.Header.Set("X-Auth", fmt.Sprintf("user2:%s", token2))
	router.ServeHTTP(wU2, reqU2)
	assert.Equal(t, http.StatusOK, wU2.Code)
}

// TEST 16 & 17 — Rate limiting isolation
func TestAuth_RateLimiterPerPrincipalIsolation(t *testing.T) {
	clientToken := computeClientToken("correct_pass")
	argonHash, err := auth.HashPassword(clientToken)
	require.NoError(t, err)

	accounts := []config.UserAccount{
		{Username: "alice", Password: argonHash},
		{Username: "bob", Password: argonHash},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// Failed attempts for alice
	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
		req.Header.Set("X-Auth", "alice:wrong_token")
		router.ServeHTTP(w, req)
	}

	// Next attempt for alice should be throttled (429)
	wAlice := httptest.NewRecorder()
	reqAlice, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	reqAlice.Header.Set("X-Auth", "alice:wrong_token")
	router.ServeHTTP(wAlice, reqAlice)
	assert.Equal(t, http.StatusTooManyRequests, wAlice.Code)

	// Bob should NOT be blocked by alice's rate limit exhaustion
	wBob := httptest.NewRecorder()
	reqBob, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	reqBob.Header.Set("X-Auth", fmt.Sprintf("bob:%s", clientToken))
	router.ServeHTTP(wBob, reqBob)
	assert.Equal(t, http.StatusOK, wBob.Code)
}

// TEST 20-22 — Missing and malformed headers
func TestAuth_MissingAndMalformedHeaders(t *testing.T) {
	accounts := []config.UserAccount{
		{Username: "alice", Password: computeLegacyStoredHash("password")},
	}
	router, _, _ := setupAuthTestRouter(t, accounts)

	// Missing header
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusUnauthorized, w1.Code)

	// Malformed header without colon
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	req2.Header.Set("X-Auth", "invalid_header_without_colon")
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusUnauthorized, w2.Code)
}
