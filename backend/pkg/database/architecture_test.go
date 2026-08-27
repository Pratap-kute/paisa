package database

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestProductionSchemaChangesStayInDatabasePackage(t *testing.T) {
	repoRoot := repositoryRoot(t)
	for _, root := range []string{filepath.Join(repoRoot, "backend"), filepath.Join(repoRoot, "desktop")} {
		err := filepath.WalkDir(root, func(path string, entry os.DirEntry, walkErr error) error {
			require.NoError(t, walkErr)
			if entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
				return nil
			}
			file, err := parser.ParseFile(token.NewFileSet(), path, nil, 0)
			require.NoError(t, err)
			ast.Inspect(file, func(node ast.Node) bool {
				selector, ok := node.(*ast.SelectorExpr)
				if ok && selector.Sel.Name == "AutoMigrate" {
					t.Errorf("production schema mutation is forbidden outside pkg/database: %s", path)
				}
				return true
			})
			return nil
		})
		require.NoError(t, err)
	}
}

func TestDatabaseEntryPointsUseSharedInitializer(t *testing.T) {
	repoRoot := repositoryRoot(t)
	for _, path := range []string{
		filepath.Join(repoRoot, "backend", "cmd", "serve.go"),
		filepath.Join(repoRoot, "backend", "cmd", "update.go"),
		filepath.Join(repoRoot, "desktop", "app.go"),
	} {
		content, err := os.ReadFile(path)
		require.NoError(t, err)
		require.Contains(t, string(content), "database.Initialize()", "%s must use centralized database initialization", path)
	}
}

func repositoryRoot(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
}
