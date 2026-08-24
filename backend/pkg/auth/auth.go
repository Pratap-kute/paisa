package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"golang.org/x/crypto/argon2"
)

var (
	ErrInvalidHash         = errors.New("the encoded hash is not in the correct format")
	ErrIncompatibleVersion = errors.New("incompatible version of argon2")
	ErrPasswordTooLong     = errors.New("password exceeds maximum allowed length")
)

const (
	MaxPasswordLength = 1024 // 1KB max password length to prevent CPU exhaustion

	// Argon2id recommended parameters for interactive login on modest hardware
	Argon2Time        = 3         // 3 iterations
	Argon2Memory      = 64 * 1024 // 64 MB
	Argon2Parallelism = 2         // 2 threads
	Argon2SaltLength  = 16        // 16 bytes salt
	Argon2KeyLength   = 32        // 32 bytes derived key
)

type Params struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

var DefaultParams = &Params{
	Memory:      Argon2Memory,
	Iterations:  Argon2Time,
	Parallelism: Argon2Parallelism,
	SaltLength:  Argon2SaltLength,
	KeyLength:   Argon2KeyLength,
}

// HashPassword generates an Argon2id PHC-formatted hash string
func HashPassword(password string) (string, error) {
	return HashPasswordWithParams(password, DefaultParams)
}

// HashPasswordWithParams generates an Argon2id hash using custom parameters (useful for tests)
func HashPasswordWithParams(password string, p *Params) (string, error) {
	if len(password) > MaxPasswordLength {
		return "", ErrPasswordTooLong
	}

	salt := make([]byte, p.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, p.Iterations, p.Memory, p.Parallelism, p.KeyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, p.Memory, p.Iterations, p.Parallelism, b64Salt, b64Hash)

	return encoded, nil
}

// VerifyPassword verifies a supplied token against stored credential (Argon2id or legacy SHA256)
// Returns:
// - valid: true if password matches
// - needsRehash: true if password matched a legacy hash and should be upgraded to Argon2id
// - err: non-nil if credential format is corrupted
func VerifyPassword(storedCredential, suppliedToken string) (valid bool, needsRehash bool, err error) {
	if len(suppliedToken) > MaxPasswordLength {
		return false, false, ErrPasswordTooLong
	}

	if strings.HasPrefix(storedCredential, "$argon2id$") {
		match, verifyErr := verifyArgon2id(storedCredential, suppliedToken)
		return match, false, verifyErr
	}

	if strings.HasPrefix(storedCredential, "sha256:") {
		match := verifyLegacySHA256(storedCredential, suppliedToken)
		return match, match, nil
	}

	return false, false, ErrInvalidHash
}

func verifyArgon2id(encodedHash, password string) (bool, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false, ErrInvalidHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return false, ErrInvalidHash
	}
	if version != argon2.Version {
		return false, ErrIncompatibleVersion
	}

	var memory, iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false, ErrInvalidHash
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false, ErrInvalidHash
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false, ErrInvalidHash
	}

	keyLen := uint32(len(expectedHash))
	if iterations < 1 || memory < 8 || parallelism < 1 || keyLen < 1 {
		return false, ErrInvalidHash
	}
	computedHash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLen)

	if subtle.ConstantTimeCompare(computedHash, expectedHash) == 1 {
		return true, nil
	}

	return false, nil
}

func verifyLegacySHA256(storedCredential, suppliedToken string) bool {
	sum := sha256.Sum256([]byte(suppliedToken))
	hashed := hex.EncodeToString(sum[:])
	expected := "sha256:" + hashed
	return subtle.ConstantTimeCompare([]byte(storedCredential), []byte(expected)) == 1
}
