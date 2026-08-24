package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/web"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupHardenedTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	dir := t.TempDir()
	journalPath := filepath.Join(dir, "main.ledger")
	dbPath := filepath.Join(dir, "paisa.db")
	cfgPath := filepath.Join(dir, "paisa.yaml")

	require.NoError(t, os.WriteFile(journalPath, []byte(""), 0o600))
	cfgContent := fmt.Sprintf("journal_path: %s\ndb_path: %s\nlocale: en-US\n", journalPath, dbPath)
	require.NoError(t, os.WriteFile(cfgPath, []byte(cfgContent), 0o600))
	require.NoError(t, config.LoadConfig([]byte(cfgContent), cfgPath))

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	require.NoError(t, err)

	router := Build(db, false)
	return router, db
}

func TestRouting_API404(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	// Unknown /api route must return JSON 404
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/non_existent_endpoint", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")

	var resp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "not_found", resp["error"])
	assert.Equal(t, "API endpoint not found", resp["message"])
}

func TestRouting_SPAFallback(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	// Unknown non-api route must return SPA index HTML
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/portfolio/my-holdings", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "text/html")
	assert.Equal(t, web.Index, w.Body.String())
}

func TestRequestLimits_ConfigOversized(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	// Payload larger than DefaultJSONLimit (2MB)
	hugePayload := bytes.Repeat([]byte("a: 1\n"), (2*1024*1024)/5+100)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(hugePayload))
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}

func TestRequestLimits_EditorSaveOversized(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	// Payload larger than DefaultEditorLimit (10MB)
	hugeContent := string(bytes.Repeat([]byte("x"), 11*1024*1024))
	body, err := json.Marshal(LedgerFile{
		Name:    "main.ledger",
		Content: hugeContent,
	})
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/editor/save", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}

func TestRequestInput_MalformedJSON(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/sync", strings.NewReader("{invalid json payload"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPanicRecovery_KeepsServerAlive(t *testing.T) {
	router, _ := setupHardenedTestRouter(t)

	// Register a temporary test route that panics
	router.GET("/api/test-panic", func(c *gin.Context) {
		panic("simulated critical handler panic")
	})

	// Panicking request must receive controlled 500 without crashing process
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodGet, "/api/test-panic", nil)
	router.ServeHTTP(w1, req1)

	assert.Equal(t, http.StatusInternalServerError, w1.Code)
	var resp map[string]interface{}
	err := json.Unmarshal(w1.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Equal(t, "internal_server_error", resp["error"])

	// Subsequent request must succeed normally
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodGet, "/api/ping", nil)
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
}

func TestServer_GracefulShutdownAndInFlightRequest(t *testing.T) {
	gin.SetMode(gin.ReleaseMode)
	testRouter := gin.New()
	testRouter.Use(SafeRecovery())

	var inFlightFinished atomic.Bool
	testRouter.GET("/slow-operation", func(c *gin.Context) {
		time.Sleep(100 * time.Millisecond)
		inFlightFinished.Store(true)
		c.JSON(http.StatusOK, gin.H{"status": "finished"})
	})

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)

	srv := NewServer(testRouter, listener.Addr().String())

	serverStopped := make(chan error, 1)
	go func() {
		serverStopped <- srv.Serve(listener)
	}()

	// Send an in-flight request
	reqDone := make(chan struct{})
	go func() {
		resp, getErr := http.Get(fmt.Sprintf("http://%s/slow-operation", listener.Addr().String()))
		if getErr == nil {
			_, _ = io.ReadAll(resp.Body)
			_ = resp.Body.Close()
		}
		close(reqDone)
	}()

	// Give the request a moment to enter the handler
	time.Sleep(30 * time.Millisecond)

	// Initiate graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err = srv.Shutdown(shutdownCtx)
	require.NoError(t, err)

	<-reqDone
	assert.True(t, inFlightFinished.Load(), "In-flight request should complete before shutdown returns")

	serverErr := <-serverStopped
	assert.Equal(t, http.ErrServerClosed, serverErr)
}
