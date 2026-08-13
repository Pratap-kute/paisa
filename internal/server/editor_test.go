package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEnsureJournalFileCreatesMissingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "main.ledger")

	if err := ensureJournalFile(path, false); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("journal file was not created: %v", err)
	}
}

func TestEnsureJournalFileDoesNotCreateInReadonlyMode(t *testing.T) {
	path := filepath.Join(t.TempDir(), "main.ledger")

	if err := ensureJournalFile(path, true); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("expected journal file not to exist, got %v", err)
	}
}

func TestEnsureJournalFilePreservesExistingContent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "main.ledger")
	const content = "existing journal\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}

	if err := ensureJournalFile(path, false); err != nil {
		t.Fatal(err)
	}
	actual, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(actual) != content {
		t.Fatalf("journal content changed: %q", actual)
	}
}
