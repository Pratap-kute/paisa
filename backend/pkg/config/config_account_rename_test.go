package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAccountConfig(t *testing.T) (path string, hash string) {
	t.Helper()
	dir := t.TempDir()
	path = filepath.Join(dir, "paisa.yaml")
	var err error
	hash, err = auth.HashPasswordWithParams("right", &auth.Params{Memory: 8, Iterations: 1, Parallelism: 1, SaltLength: 16, KeyLength: 32})
	require.NoError(t, err)
	content := []byte("journal_path: main.ledger\ndb_path: paisa.db\nuser_accounts:\n  - username: alice\n    password: \"" + hash + "\"\n")
	require.NoError(t, os.WriteFile(path, content, 0o600))
	require.NoError(t, LoadConfig(content, path))
	t.Cleanup(func() { _ = LoadConfig([]byte("journal_path: x.ledger\n"), "") })
	return path, hash
}

func TestSaveConfig_RenamedUserWithoutPasswordIsRejected(t *testing.T) {
	path, hash := setupAccountConfig(t)
	before, err := os.ReadFile(path)
	require.NoError(t, err)

	err = SaveConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\nuser_accounts:\n  - username: bob\n    password: \"\"\n"))

	require.Error(t, err, "a user with no stored password must not be saved")
	accounts := GetConfig().UserAccounts
	require.Len(t, accounts, 1)
	assert.Equal(t, "alice", accounts[0].Username)
	assert.Equal(t, hash, accounts[0].Password)
	after, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, string(before), string(after), "paisa.yaml must be untouched")
}

func TestSaveConfig_RenamedUserWithPasswordIsHashed(t *testing.T) {
	setupAccountConfig(t)

	require.NoError(t, SaveConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\nuser_accounts:\n  - username: bob\n    password: \"s3cret\"\n")))

	accounts := GetConfig().UserAccounts
	require.Len(t, accounts, 1)
	valid, _, err := auth.VerifyPassword(accounts[0].Password, "s3cret")
	require.NoError(t, err)
	assert.True(t, valid)
}

func TestSaveConfig_ExistingUserWithBlankPasswordKeepsHash(t *testing.T) {
	_, hash := setupAccountConfig(t)

	require.NoError(t, SaveConfig([]byte("journal_path: main.ledger\ndb_path: paisa.db\nuser_accounts:\n  - username: alice\n    password: \"\"\n")))

	assert.Equal(t, hash, GetConfig().UserAccounts[0].Password)
}
