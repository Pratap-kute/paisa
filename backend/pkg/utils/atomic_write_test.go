package utils

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAtomicWriteFile_Success(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "journal.ledger")
	data := []byte("2024-01-01 * Opening Balance\n  Assets:Checking  1000 INR\n  Equity  -1000 INR\n")

	err := AtomicWriteFile(target, data, 0o644)
	require.NoError(t, err)

	readBack, err := os.ReadFile(target)
	require.NoError(t, err)
	assert.Equal(t, string(data), string(readBack))

	info, err := os.Stat(target)
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o644), info.Mode().Perm())

	// Overwrite with new data
	newData := []byte("2024-01-02 * Buy Groceries\n  Expenses:Groceries  200 INR\n  Assets:Checking  -200 INR\n")
	err = AtomicWriteFile(target, newData, 0o644)
	require.NoError(t, err)

	readBack2, err := os.ReadFile(target)
	require.NoError(t, err)
	assert.Equal(t, string(newData), string(readBack2))

	// Verify no stray temp files left
	files, err := filepath.Glob(filepath.Join(dir, ".paisa-tmp-*"))
	require.NoError(t, err)
	assert.Empty(t, files)
}

func TestAtomicWriteFile_TempFileCleanupOnDirectoryError(t *testing.T) {
	dir := t.TempDir()
	// Target path that cannot be created because a file already exists at a directory step
	blocker := filepath.Join(dir, "blocker")
	require.NoError(t, os.WriteFile(blocker, []byte("file"), 0o644))
	target := filepath.Join(blocker, "sub", "target.txt")

	err := AtomicWriteFile(target, []byte("test"), 0o644)
	require.Error(t, err)

	files, err := filepath.Glob(filepath.Join(dir, ".paisa-tmp-*"))
	require.NoError(t, err)
	assert.Empty(t, files)
}
