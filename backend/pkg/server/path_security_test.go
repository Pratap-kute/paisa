package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupPathSecurityTestEnvironment(t *testing.T) (string, http.Handler) {
	t.Helper()
	tempDir := t.TempDir()
	journalDir := filepath.Join(tempDir, "journal")
	sheetsDir := filepath.Join(tempDir, "sheets")
	require.NoError(t, os.MkdirAll(journalDir, 0755))
	require.NoError(t, os.MkdirAll(filepath.Join(journalDir, "nested"), 0755))
	require.NoError(t, os.MkdirAll(sheetsDir, 0755))
	require.NoError(t, os.MkdirAll(filepath.Join(sheetsDir, "nested"), 0755))

	mainLedger := filepath.Join(journalDir, "main.ledger")
	nestedLedger := filepath.Join(journalDir, "nested", "extra.ledger")
	sheetFile := filepath.Join(sheetsDir, "main.paisa")
	nestedSheet := filepath.Join(sheetsDir, "nested", "extra.paisa")

	require.NoError(t, os.WriteFile(mainLedger, []byte("; main ledger\n"), 0644))
	require.NoError(t, os.WriteFile(nestedLedger, []byte("; nested ledger\n"), 0644))
	require.NoError(t, os.WriteFile(sheetFile, []byte("# sheet\n"), 0644))
	require.NoError(t, os.WriteFile(nestedSheet, []byte("# nested sheet\n"), 0644))

	configYAML := fmt.Sprintf("journal_path: %s\ndb_path: %s\nsheets_directory: %s\n", mainLedger, filepath.Join(tempDir, "paisa.db"), sheetsDir)
	db := setupContractTestDB(t, configYAML)
	router := Build(db, false)
	return tempDir, router
}

func TestPathSecurity_EditorEndpoints(t *testing.T) {
	_, router := setupPathSecurityTestEnvironment(t)

	t.Run("valid file read", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/editor/file", `{"name":"main.ledger"}`)
		assert.Equal(t, http.StatusOK, res.Code)
		var body map[string]any
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
		assert.NotNil(t, body["file"])
	})

	t.Run("valid nested file read", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/editor/file", `{"name":"nested/extra.ledger"}`)
		assert.Equal(t, http.StatusOK, res.Code)
		var body map[string]any
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
		assert.NotNil(t, body["file"])
	})

	traversalInputs := []string{
		"../secret",
		"../../etc/passwd",
		"../../../etc/shadow",
		"/etc/passwd",
		"/secret/data.ledger",
	}

	for _, input := range traversalInputs {
		t.Run(fmt.Sprintf("reject GetFile %s", input), func(t *testing.T) {
			payload, _ := json.Marshal(map[string]string{"name": input})
			res := performRequest(router, http.MethodPost, "/api/editor/file", string(payload))
			assert.Equal(t, http.StatusBadRequest, res.Code, "Path traversal %s must be rejected with 400", input)
		})

		t.Run(fmt.Sprintf("reject DeleteBackups %s", input), func(t *testing.T) {
			payload, _ := json.Marshal(map[string]string{"name": input})
			res := performRequest(router, http.MethodPost, "/api/editor/file/delete_backups", string(payload))
			assert.Equal(t, http.StatusBadRequest, res.Code, "Path traversal %s must be rejected with 400", input)
		})
	}

	t.Run("non-existent file returns 404", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/editor/file", `{"name":"does_not_exist.ledger"}`)
		assert.Equal(t, http.StatusNotFound, res.Code)
	})
}

func TestPathSecurity_SheetEndpoints(t *testing.T) {
	_, router := setupPathSecurityTestEnvironment(t)

	t.Run("valid sheet file read", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/sheets/file", `{"name":"main.paisa"}`)
		assert.Equal(t, http.StatusOK, res.Code)
		var body map[string]any
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
		assert.NotNil(t, body["file"])
	})

	t.Run("valid nested sheet file read", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/sheets/file", `{"name":"nested/extra.paisa"}`)
		assert.Equal(t, http.StatusOK, res.Code)
		var body map[string]any
		require.NoError(t, json.Unmarshal(res.Body.Bytes(), &body))
		assert.NotNil(t, body["file"])
	})

	traversalInputs := []string{
		"../secret",
		"../../etc/passwd",
		"../../../etc/shadow",
		"/etc/passwd",
		"/secret/notes.paisa",
	}

	for _, input := range traversalInputs {
		t.Run(fmt.Sprintf("reject GetSheet %s", input), func(t *testing.T) {
			payload, _ := json.Marshal(map[string]string{"name": input})
			res := performRequest(router, http.MethodPost, "/api/sheets/file", string(payload))
			assert.Equal(t, http.StatusBadRequest, res.Code, "Path traversal %s must be rejected with 400", input)
		})

		t.Run(fmt.Sprintf("reject DeleteSheetBackups %s", input), func(t *testing.T) {
			payload, _ := json.Marshal(map[string]string{"name": input})
			res := performRequest(router, http.MethodPost, "/api/sheets/file/delete_backups", string(payload))
			assert.Equal(t, http.StatusBadRequest, res.Code, "Path traversal %s must be rejected with 400", input)
		})
	}

	t.Run("non-existent sheet file returns 404", func(t *testing.T) {
		res := performRequest(router, http.MethodPost, "/api/sheets/file", `{"name":"does_not_exist.paisa"}`)
		assert.Equal(t, http.StatusNotFound, res.Code)
	})
}
