package database

import (
	"fmt"
	"os"
	"path/filepath"
)

func validateDirectory(dbPath string) error {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("database directory %q cannot be created: %w", dir, err)
	}

	probe, err := os.CreateTemp(dir, ".paisa-write-probe-*")
	if err != nil {
		return fmt.Errorf("database directory %q is not writable: %w", dir, err)
	}
	probePath := probe.Name()
	if closeErr := probe.Close(); closeErr != nil {
		_ = os.Remove(probePath)
		return fmt.Errorf("database directory write probe %q cannot be closed: %w", probePath, closeErr)
	}
	if err := os.Remove(probePath); err != nil {
		return fmt.Errorf("database directory write probe %q cannot be removed: %w", probePath, err)
	}
	return nil
}

func storageError(dbPath string, err error) error {
	return fmt.Errorf(
		"paisa cannot initialize its database.\n\nDatabase:\n  %s\n\nReason:\n  %w\n\nPaisa requires writable persistent storage because it updates SQLite data. Make the database file and its containing directory writable, then restart Paisa",
		dbPath,
		err,
	)
}
