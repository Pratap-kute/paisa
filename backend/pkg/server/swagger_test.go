package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/ananthakumaran/paisa/docs"
	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type swaggerDoc struct {
	Swagger             string                    `json:"swagger"`
	Info                map[string]any            `json:"info"`
	BasePath            string                    `json:"basePath"`
	Paths               map[string]map[string]any `json:"paths"`
	Definitions         map[string]any            `json:"definitions"`
	SecurityDefinitions map[string]struct {
		Type        string `json:"type"`
		Name        string `json:"name"`
		In          string `json:"in"`
		Description string `json:"description"`
	} `json:"securityDefinitions"`
}

// TestSwagger_SpecValidation validates that docs/swagger.json and docs.go parse cleanly,
// contain expected general metadata, security definitions, and valid JSON structure.
func TestSwagger_SpecValidation(t *testing.T) {
	docJSON := docs.SwaggerInfo.ReadDoc()
	require.NotEmpty(t, docJSON, "Generated Swagger JSON must not be empty")

	var doc swaggerDoc
	err := json.Unmarshal([]byte(docJSON), &doc)
	require.NoError(t, err, "Failed to parse docs.SwaggerInfo doc JSON")

	// 1. Basic Metadata
	assert.Equal(t, "2.0", doc.Swagger)
	assert.Equal(t, "Paisa API", doc.Info["title"])
	assert.Equal(t, "0.1.0", doc.Info["version"])
	assert.Equal(t, "/api", doc.BasePath)

	// 2. Security Definition
	paisaAuth, exists := doc.SecurityDefinitions["PaisaAuth"]
	require.True(t, exists, "PaisaAuth security definition must exist")
	assert.Equal(t, "apiKey", paisaAuth.Type)
	assert.Equal(t, "X-Auth", paisaAuth.Name)
	assert.Equal(t, "header", paisaAuth.In)

	// 3. Definitions presence
	assert.GreaterOrEqual(t, len(doc.Definitions), 20, "Expected at least 20 component definitions")
	assert.GreaterOrEqual(t, len(doc.Paths), 30, "Expected at least 30 path items")
}

// TestSwagger_RouteCoverage ensures 100% parity between Gin registered /api/* routes
// and Swagger annotated endpoints.
func TestSwagger_RouteCoverage(t *testing.T) {
	db := setupContractTestDB(t, "")
	router := Build(db, false)
	routes := router.Routes()

	docJSON := docs.SwaggerInfo.ReadDoc()
	var doc swaggerDoc
	require.NoError(t, json.Unmarshal([]byte(docJSON), &doc))

	// Build map of Swagger documented routes: "METHOD /api/path"
	specAPIRoutes := make(map[string]bool)
	basePath := strings.TrimSuffix(doc.BasePath, "/")
	for path, operations := range doc.Paths {
		fullPath := basePath + path
		for method := range operations {
			specAPIRoutes[strings.ToUpper(method)+" "+fullPath] = true
		}
	}

	// Normalize Gin :param to Swagger {param}
	paramRegex := regexp.MustCompile(`/:([a-zA-Z0-9_]+)`)

	ginAPIRoutes := make(map[string]bool)
	for _, route := range routes {
		if !strings.HasPrefix(route.Path, "/api/") && route.Path != "/api" {
			continue
		}

		normalizedPath := paramRegex.ReplaceAllString(route.Path, "/{$1}")
		normalizedKey := route.Method + " " + normalizedPath
		ginAPIRoutes[normalizedKey] = true

		if !specAPIRoutes[normalizedKey] {
			t.Errorf("Gin route %s is registered on server but missing in Swagger annotations", normalizedKey)
		}
	}

	// Verify no ghost routes in Swagger that do not exist on the Gin server
	for specKey := range specAPIRoutes {
		if !ginAPIRoutes[specKey] {
			t.Errorf("Swagger documents %s, but no corresponding Gin route exists", specKey)
		}
	}

	t.Logf("Route Coverage Summary: Gin /api operations = %d, Swagger operations = %d, Mismatches = 0",
		len(ginAPIRoutes), len(specAPIRoutes))
	assert.Equal(t, len(ginAPIRoutes), len(specAPIRoutes))
}

// TestSwagger_NoModelLeakageOrSecrets ensures generated Swagger schemas do not expose
// internal persistence models, GORM structures, or password verifiers.
func TestSwagger_NoModelLeakageOrSecrets(t *testing.T) {
	docJSON := docs.SwaggerInfo.ReadDoc()

	forbiddenSubstrings := []string{
		"gorm.Model",
		"DeletedAt",
		"password_hash",
		"argon2id$",
		"verifier",
		"secret_key",
		"/etc/shadow",
		"/etc/passwd",
		"C:\\Users",
		"/home/",
	}

	for _, forbidden := range forbiddenSubstrings {
		assert.NotContains(t, docJSON, forbidden, "Swagger spec must not contain internal artifact %q", forbidden)
	}

	var doc swaggerDoc
	require.NoError(t, json.Unmarshal([]byte(docJSON), &doc))

	// Ensure all definition names are strictly DTOs or server transport structs
	for defName := range doc.Definitions {
		assert.True(t,
			strings.HasPrefix(defName, "dto.") || strings.HasPrefix(defName, "server."),
			"Definition %q violates DTO encapsulation rule", defName)
	}
}

// TestSwagger_UIRouteAndNoSPAFallthrough verifies that Swagger UI is served at /swagger/index.html
// and /swagger/doc.json, without falling through to the Svelte SPA or colliding with /api 404s.
func TestSwagger_UIRouteAndNoSPAFallthrough(t *testing.T) {
	db := setupContractTestDB(t, "")
	router := Build(db, false)
	ts := httptest.NewServer(router)
	defer ts.Close()

	client := ts.Client()

	// 1. GET /swagger/index.html returns Swagger UI HTML
	respUI, err := client.Get(ts.URL + "/swagger/index.html")
	require.NoError(t, err)
	defer respUI.Body.Close()
	assert.Equal(t, http.StatusOK, respUI.StatusCode)
	assert.Contains(t, respUI.Header.Get("Content-Type"), "text/html")

	// 2. GET /swagger/doc.json returns Swagger JSON document
	respDoc, err := client.Get(ts.URL + "/swagger/doc.json")
	require.NoError(t, err)
	defer respDoc.Body.Close()
	assert.Equal(t, http.StatusOK, respDoc.StatusCode)
	assert.Contains(t, respDoc.Header.Get("Content-Type"), "application/json")

	// 3. GET /api/unknown_route returns JSON 404
	respAPI404, err := client.Get(ts.URL + "/api/unknown_route")
	require.NoError(t, err)
	defer respAPI404.Body.Close()
	assert.Equal(t, http.StatusNotFound, respAPI404.StatusCode)
	assert.Contains(t, respAPI404.Header.Get("Content-Type"), "application/json")

	// 4. GET /some_spa_route returns SPA HTML fallback
	respSPA, err := client.Get(ts.URL + "/dashboard")
	require.NoError(t, err)
	defer respSPA.Body.Close()
	assert.Equal(t, http.StatusOK, respSPA.StatusCode)
	assert.Contains(t, respSPA.Header.Get("Content-Type"), "text/html")
}

// TestSwagger_AuthIntegration verifies that API requests originating from Swagger UI
// or any client must strictly obey normal Paisa authentication when user accounts are configured.
func TestSwagger_AuthIntegration(t *testing.T) {
	hash, err := auth.HashPassword("secret")
	require.NoError(t, err)
	cfgContent := fmt.Sprintf("user_accounts:\n  - username: admin\n    password: %q\n", hash)

	db := setupContractTestDB(t, cfgContent)
	router := Build(db, false)
	ts := httptest.NewServer(router)
	defer ts.Close()

	client := ts.Client()

	// 1. Swagger UI itself is publicly readable
	respUI, err := client.Get(ts.URL + "/swagger/index.html")
	require.NoError(t, err)
	respUI.Body.Close()
	assert.Equal(t, http.StatusOK, respUI.StatusCode)

	// 2. Unauthenticated call to /api/ping fails with 401 Unauthorized
	respNoAuth, err := client.Get(ts.URL + "/api/ping")
	require.NoError(t, err)
	respNoAuth.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, respNoAuth.StatusCode)

	// 3. Authenticated call with X-Auth header succeeds
	req, err := http.NewRequest(http.MethodGet, ts.URL+"/api/ping", nil)
	require.NoError(t, err)
	req.Header.Set("X-Auth", "admin:secret")
	respAuth, err := client.Do(req)
	require.NoError(t, err)
	respAuth.Body.Close()
	assert.Equal(t, http.StatusOK, respAuth.StatusCode)
}

// TestSwagger_CIDrift ensures that the committed docs/ directory is completely synchronized
// with the output of the swag generator, preventing undocumented API drift.
func TestSwagger_CIDrift(t *testing.T) {
	tempDir := t.TempDir()

	cmd := exec.Command("go", "run", "github.com/swaggo/swag/cmd/swag", "init",
		"-g", "pkg/server/swagger.go",
		"-o", tempDir,
		"--parseDependency",
		"--parseInternal",
	)
	cmd.Dir = "../.."
	out, err := cmd.CombinedOutput()
	require.NoError(t, err, "Failed to run swag init: %s", string(out))

	// Compare generated swagger.json with committed docs/swagger.json
	committedJSON, err := os.ReadFile(filepath.Join("..", "..", "docs", "swagger.json"))
	require.NoError(t, err)

	tempJSON, err := os.ReadFile(filepath.Join(tempDir, "swagger.json"))
	require.NoError(t, err)

	assert.JSONEq(t, string(committedJSON), string(tempJSON),
		"Committed docs/swagger.json is out of date. Run 'make swagger' or 'go generate ./...'")
}
