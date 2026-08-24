package server

import (
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestArchitecture_DependencyBoundaries ensures lower-level domain packages
// do not import Gin or pkg/server
func TestArchitecture_DependencyBoundaries(t *testing.T) {
	backendRoot, err := filepath.Abs("../..")
	require.NoError(t, err)

	allowedGinDirs := map[string]bool{
		"pkg/server":             true,
		"pkg/server/assets":      true,
		"pkg/server/goal":        true,
		"pkg/server/liabilities": true,
	}

	err = filepath.WalkDir(filepath.Join(backendRoot, "pkg"), func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		rel, err := filepath.Rel(backendRoot, path)
		if err != nil {
			return err
		}
		dir := filepath.ToSlash(filepath.Dir(rel))

		fset := token.NewFileSet()
		node, err := parser.ParseFile(fset, path, nil, parser.ImportsOnly)
		if err != nil {
			return err
		}

		for _, imp := range node.Imports {
			impPath := strings.Trim(imp.Path.Value, `"`)

			// 1. Check Gin imports
			if impPath == "github.com/gin-gonic/gin" {
				if !allowedGinDirs[dir] {
					t.Errorf("Forbidden Gin import in %s: lower-level domain packages must not depend on HTTP framework", rel)
				}
			}

			// 2. Check pkg/server imports
			if strings.HasPrefix(impPath, "github.com/ananthakumaran/paisa/pkg/server") {
				if !strings.HasPrefix(dir, "pkg/server") && !strings.HasPrefix(dir, "cmd") {
					t.Errorf("Forbidden pkg/server import in %s: lower-level packages must not depend on server layer", rel)
				}
			}
		}

		return nil
	})
	require.NoError(t, err)
}

// TestArchitecture_NoDeepLogFatal ensures deep domain/model/query packages do not call log.Fatal
func TestArchitecture_NoDeepLogFatal(t *testing.T) {
	backendRoot, err := filepath.Abs("../..")
	require.NoError(t, err)

	exemptPackages := map[string]bool{
		"cmd":        true, // Startup CLI
		"pkg/config": true, // Config validation startup
	}

	err = filepath.WalkDir(filepath.Join(backendRoot, "pkg"), func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}

		rel, err := filepath.Rel(backendRoot, path)
		if err != nil {
			return err
		}
		dir := filepath.ToSlash(filepath.Dir(rel))
		if exemptPackages[dir] {
			return nil
		}

		// Allow server.go only for the srv.ListenAndServe startup failure
		if rel == filepath.Join("pkg", "server", "server.go") {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}

		if strings.Contains(string(content), "log.Fatal") {
			assert.Fail(t, "Forbidden log.Fatal found in domain package", "File: %s", rel)
		}

		return nil
	})
	require.NoError(t, err)
}
