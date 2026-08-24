package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testSha256(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

var testFastParams = &Params{
	Memory:      16 * 1024,
	Iterations:  1,
	Parallelism: 1,
	SaltLength:  16,
	KeyLength:   32,
}

func TestAuth_Argon2idSuccess(t *testing.T) {
	password := "my-secret-password-123"
	hash, err := HashPasswordWithParams(password, testFastParams)
	require.NoError(t, err)
	assert.Contains(t, hash, "$argon2id$v=19$")

	valid, needsRehash, err := VerifyPassword(hash, password)
	require.NoError(t, err)
	assert.True(t, valid)
	assert.False(t, needsRehash)
}

func TestAuth_Argon2idWrongPassword(t *testing.T) {
	password := "correct-password"
	hash, err := HashPasswordWithParams(password, testFastParams)
	require.NoError(t, err)

	valid, needsRehash, err := VerifyPassword(hash, "wrong-password")
	require.NoError(t, err)
	assert.False(t, valid)
	assert.False(t, needsRehash)
}

func TestAuth_LegacySHA256Success(t *testing.T) {
	rawPassword := "legacy-password-456"
	inner := testSha256(rawPassword)
	legacyStored := "sha256:" + testSha256(inner)

	// User logs in providing inner (sha256(rawPassword))
	valid, needsRehash, err := VerifyPassword(legacyStored, inner)
	require.NoError(t, err)
	assert.True(t, valid)
	assert.True(t, needsRehash, "Legacy SHA256 credential must signal needsRehash")
}

func TestAuth_LegacySHA256WrongPassword(t *testing.T) {
	rawPassword := "legacy-password-456"
	inner := testSha256(rawPassword)
	legacyStored := "sha256:" + testSha256(inner)

	wrongInner := testSha256("wrong-raw-password")
	valid, needsRehash, err := VerifyPassword(legacyStored, wrongInner)
	require.NoError(t, err)
	assert.False(t, valid)
	assert.False(t, needsRehash)
}

func TestAuth_UniqueSalts(t *testing.T) {
	password := "same-password-across-accounts"
	hash1, err := HashPasswordWithParams(password, testFastParams)
	require.NoError(t, err)

	hash2, err := HashPasswordWithParams(password, testFastParams)
	require.NoError(t, err)

	assert.NotEqual(t, hash1, hash2, "Hashes for the same password must differ due to unique salts")
}

func TestAuth_MalformedStoredCredential(t *testing.T) {
	malformed := "$argon2id$invalid$params$salt$hash"
	valid, needsRehash, err := VerifyPassword(malformed, "password")
	assert.False(t, valid)
	assert.False(t, needsRehash)
	assert.Error(t, err)

	garbage := "unrecognized_prefix_hash_123"
	valid, needsRehash, err = VerifyPassword(garbage, "password")
	assert.False(t, valid)
	assert.False(t, needsRehash)
	assert.Error(t, err)
}
