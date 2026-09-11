package utils

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBuildSubPath(t *testing.T) {
	base := "/usr/home/john/paisa"
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "file", input: "main.ledger", want: base + "/main.ledger"},
		{name: "nested file", input: "subfolder/main.ledger", want: base + "/subfolder/main.ledger"},
		{name: "safe double dots in filename", input: "reports/budget..draft.ledger", want: base + "/reports/budget..draft.ledger"},
		{name: "escape multiple parents", input: "../../../subfolder/travel.ledger", wantErr: true},
		{name: "parent", input: "..", wantErr: true},
		{name: "cleaned parent", input: "./..", wantErr: true},
		{name: "parent file", input: "./../test.ledger", wantErr: true},
		{name: "absolute path escape", input: "/etc/passwd", wantErr: true},
		{name: "absolute path secret", input: "/secret/data.ledger", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path, err := BuildSubPath(base, tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, path)
		})
	}
}

func TestBuildSubPath_SymlinkEscape(t *testing.T) {
	tempDir := t.TempDir()
	baseDir := filepath.Join(tempDir, "workspace")
	outsideDir := filepath.Join(tempDir, "outside")
	require.NoError(t, os.MkdirAll(baseDir, 0755))
	require.NoError(t, os.MkdirAll(outsideDir, 0755))

	secretFile := filepath.Join(outsideDir, "secret.txt")
	require.NoError(t, os.WriteFile(secretFile, []byte("super secret"), 0644))

	// Create symlink inside base pointing outside
	symlinkPath := filepath.Join(baseDir, "symlink_to_outside")
	require.NoError(t, os.Symlink(secretFile, symlinkPath))

	// Create symlink directory pointing outside
	symlinkDir := filepath.Join(baseDir, "symlink_dir")
	require.NoError(t, os.Symlink(outsideDir, symlinkDir))

	// 1. Direct symlink file to outside should be rejected
	_, err := BuildSubPath(baseDir, "symlink_to_outside")
	assert.Error(t, err, "symlink pointing outside base directory must be rejected")

	// 2. Path traversing through symlink dir should be rejected
	_, err = BuildSubPath(baseDir, "symlink_dir/secret.txt")
	assert.Error(t, err, "path through symlink dir pointing outside must be rejected")

	// 3. Normal file inside baseDir should be allowed
	validFile := filepath.Join(baseDir, "main.ledger")
	require.NoError(t, os.WriteFile(validFile, []byte("test"), 0644))
	p, err := BuildSubPath(baseDir, "main.ledger")
	assert.NoError(t, err)
	assert.Equal(t, validFile, p)
}

func TestFYFormatting(t *testing.T) {
	require.NoError(t, config.LoadConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\n"), ""))

	t.Run("century boundary year 2099", func(t *testing.T) {
		d := time.Date(2099, time.May, 1, 0, 0, 0, 0, time.UTC)
		assert.Equal(t, "2099-00", FY(d))
		assert.Equal(t, "2099 - 00", FYHuman(d))
	})

	t.Run("single digit year boundary", func(t *testing.T) {
		d := time.Date(2004, time.May, 1, 0, 0, 0, 0, time.UTC)
		assert.Equal(t, "2004-05", FY(d))
		assert.Equal(t, "2004 - 05", FYHuman(d))
	})

	t.Run("before financial year start month", func(t *testing.T) {
		d := time.Date(2005, time.February, 1, 0, 0, 0, 0, time.UTC)
		assert.Equal(t, "2004-05", FY(d))
		assert.Equal(t, "2004 - 05", FYHuman(d))
	})
}
