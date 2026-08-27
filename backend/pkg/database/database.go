package database

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/utils"
	log "github.com/sirupsen/logrus"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const busyTimeout = 5 * time.Second

type appliedMigration struct {
	Version  int
	Name     string
	Checksum string
}

// Initialize opens and upgrades the configured Paisa database before returning it.
func Initialize() (*gorm.DB, error) {
	return InitializePath(context.Background(), config.GetDBPath())
}

// InitializePath opens and upgrades a Paisa database at an explicit path.
// Application entry points should normally use Initialize, which resolves the configured path.
func InitializePath(ctx context.Context, dbPath string) (*gorm.DB, error) {
	return initializePath(ctx, dbPath, migrations)
}

func initializePath(ctx context.Context, dbPath string, registry []migration) (*gorm.DB, error) {
	absPath, err := filepath.Abs(dbPath)
	if err != nil {
		return nil, fmt.Errorf("resolve database path %q: %w", dbPath, err)
	}
	if err := validateRegistry(registry); err != nil {
		return nil, fmt.Errorf("invalid compiled migration registry: %w", err)
	}
	if err := validateDirectory(absPath); err != nil {
		return nil, storageError(absPath, err)
	}

	dsn := sqliteDSN(absPath)
	sqlDB, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, storageError(absPath, err)
	}
	closeOnError := true
	defer func() {
		if closeOnError {
			_ = sqlDB.Close()
		}
	}()
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, storageError(absPath, err)
	}

	if err := migrate(ctx, sqlDB, absPath, registry); err != nil {
		return nil, err
	}

	db, err := gorm.Open(sqlite.Dialector{Conn: sqlDB}, &gorm.Config{Logger: utils.NewGormLogger()})
	if err != nil {
		return nil, fmt.Errorf("open initialized Paisa database %q: %w", absPath, err)
	}
	closeOnError = false
	return db, nil
}

func sqliteDSN(dbPath string) string {
	u := &url.URL{Scheme: "file", Path: filepath.ToSlash(dbPath)}
	q := u.Query()
	q.Set("mode", "rwc")
	q.Set("_busy_timeout", fmt.Sprintf("%d", busyTimeout.Milliseconds()))
	u.RawQuery = q.Encode()
	return u.String()
}

func migrate(ctx context.Context, db *sql.DB, dbPath string, registry []migration) (err error) {
	conn, err := db.Conn(ctx)
	if err != nil {
		return storageError(dbPath, err)
	}
	defer func() { _ = conn.Close() }()

	if _, err = conn.ExecContext(ctx, "BEGIN IMMEDIATE"); err != nil {
		return storageError(dbPath, fmt.Errorf("acquire SQLite migration lock: %w", err))
	}
	rollbackCtx := context.WithoutCancel(ctx)
	defer func(ctx context.Context) {
		if err != nil {
			_, _ = conn.ExecContext(ctx, "ROLLBACK")
		}
	}(rollbackCtx)

	if err = probeSQLiteWrite(ctx, conn); err != nil {
		return storageError(dbPath, err)
	}
	if err = bootstrapMigrationState(ctx, conn, dbPath, registry); err != nil {
		return err
	}

	applied, err := readAppliedMigrations(ctx, conn)
	if err != nil {
		return fmt.Errorf("read migration state for database %q: %w", dbPath, err)
	}
	if err = validateAppliedMigrations(dbPath, registry, applied); err != nil {
		return err
	}

	current := 0
	if len(applied) > 0 {
		current = applied[len(applied)-1].Version
	}
	log.Infof("Database: %s", dbPath)
	log.Infof("Database schema version: %d", current)
	for _, item := range registry {
		if item.Version <= current {
			continue
		}
		log.Infof("Applying migration %d: %s", item.Version, item.Name)
		for _, statement := range item.Statements {
			if _, err = conn.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("apply migration %d (%s) to database %q: %w", item.Version, item.Name, dbPath, err)
			}
		}
		if err = recordMigration(ctx, conn, item); err != nil {
			return fmt.Errorf("record migration %d (%s) for database %q: %w", item.Version, item.Name, dbPath, err)
		}
		log.Infof("Migration %d applied successfully", item.Version)
		current = item.Version
	}

	if _, err = conn.ExecContext(ctx, "COMMIT"); err != nil {
		return fmt.Errorf("commit migrations for database %q: %w", dbPath, err)
	}
	log.Infof("Database schema ready at version %d", current)
	return nil
}

func probeSQLiteWrite(ctx context.Context, conn *sql.Conn) error {
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return fmt.Errorf("generate SQLite write probe name: %w", err)
	}
	name := "__paisa_write_probe_" + hex.EncodeToString(random)
	if _, err := conn.ExecContext(ctx, "CREATE TABLE `"+name+"` (`id` integer)"); err != nil {
		return fmt.Errorf("SQLite database write probe failed: %w", err)
	}
	if _, err := conn.ExecContext(ctx, "DROP TABLE `"+name+"`"); err != nil {
		return fmt.Errorf("SQLite database write probe cleanup failed: %w", err)
	}
	return nil
}

func bootstrapMigrationState(ctx context.Context, conn *sql.Conn, dbPath string, registry []migration) error {
	exists, err := tableExists(ctx, conn, "schema_migrations")
	if err != nil {
		return fmt.Errorf("inspect migration state for database %q: %w", dbPath, err)
	}
	if exists {
		return nil
	}

	legacy, err := legacyTables(ctx, conn)
	if err != nil {
		return fmt.Errorf("inspect legacy schema for database %q: %w", dbPath, err)
	}
	if _, err := conn.ExecContext(ctx, `CREATE TABLE schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at DATETIME NOT NULL,
		checksum TEXT NOT NULL
	)`); err != nil {
		return fmt.Errorf("create migration history for database %q: %w", dbPath, err)
	}

	baseline := registry[0]
	if len(legacy) == 0 {
		for _, statement := range baseline.Statements {
			if _, err := conn.ExecContext(ctx, statement); err != nil {
				return fmt.Errorf("create frozen baseline for database %q: %w", dbPath, err)
			}
		}
	} else if err := validateLegacyBaseline(ctx, conn, legacy); err != nil {
		return fmt.Errorf("cannot adopt legacy database %q: %w", dbPath, err)
	}
	if err := recordMigration(ctx, conn, baseline); err != nil {
		return fmt.Errorf("record frozen baseline for database %q: %w", dbPath, err)
	}
	return nil
}

func tableExists(ctx context.Context, conn *sql.Conn, name string) (bool, error) {
	var count int
	err := conn.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?", name).Scan(&count)
	return count == 1, err
}

func legacyTables(ctx context.Context, conn *sql.Conn) (map[string]bool, error) {
	rows, err := conn.QueryContext(ctx, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations' AND name NOT LIKE '__paisa_write_probe_%'")
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	tables := make(map[string]bool)
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables[name] = true
	}
	return tables, rows.Err()
}

func validateLegacyBaseline(ctx context.Context, conn *sql.Conn, tables map[string]bool) error {
	for table, required := range baselineColumns {
		if !tables[table] {
			return fmt.Errorf("required baseline table %q is missing", table)
		}
		columns, err := tableColumns(ctx, conn, table)
		if err != nil {
			return err
		}
		for _, column := range required {
			if !columns[column] {
				return fmt.Errorf("required baseline column %q.%q is missing", table, column)
			}
		}
	}
	return nil
}

func tableColumns(ctx context.Context, conn *sql.Conn, table string) (map[string]bool, error) {
	rows, err := conn.QueryContext(ctx, "PRAGMA table_info(`"+table+"`)")
	if err != nil {
		return nil, fmt.Errorf("inspect columns for table %q: %w", table, err)
	}
	defer func() { _ = rows.Close() }()
	columns := make(map[string]bool)
	for rows.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue any
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			return nil, err
		}
		columns[name] = true
	}
	return columns, rows.Err()
}

func readAppliedMigrations(ctx context.Context, conn *sql.Conn) ([]appliedMigration, error) {
	rows, err := conn.QueryContext(ctx, "SELECT version, name, checksum FROM schema_migrations ORDER BY version")
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var result []appliedMigration
	for rows.Next() {
		var item appliedMigration
		if err := rows.Scan(&item.Version, &item.Name, &item.Checksum); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func validateAppliedMigrations(dbPath string, registry []migration, applied []appliedMigration) error {
	if len(applied) == 0 {
		return fmt.Errorf("database %q has an empty migration history", dbPath)
	}
	known := make(map[int]migration, len(registry))
	for _, item := range registry {
		known[item.Version] = item
	}
	highest := registry[len(registry)-1].Version
	for i, stored := range applied {
		if stored.Version > highest {
			return fmt.Errorf("paisa cannot open database %q because its schema is newer than this application version: database schema %d, highest supported schema %d; upgrade Paisa before opening this database", dbPath, stored.Version, highest)
		}
		expected, ok := known[stored.Version]
		if !ok || stored.Version != i+1 {
			return fmt.Errorf("database %q has unsupported or incomplete migration history at version %d", dbPath, stored.Version)
		}
		if stored.Name != expected.Name {
			return fmt.Errorf("database %q migration %d name mismatch: expected %q, stored %q", dbPath, stored.Version, expected.Name, stored.Name)
		}
		checksum := expected.Checksum()
		if stored.Checksum != checksum {
			return fmt.Errorf("database %q migration %d (%s) checksum mismatch: expected %s, stored %s", dbPath, stored.Version, expected.Name, checksum, stored.Checksum)
		}
	}
	return nil
}

func recordMigration(ctx context.Context, conn *sql.Conn, item migration) error {
	_, err := conn.ExecContext(ctx, "INSERT INTO schema_migrations(version, name, applied_at, checksum) VALUES (?, ?, ?, ?)", item.Version, item.Name, time.Now().UTC(), item.Checksum())
	return err
}

func validateRegistry(registry []migration) error {
	if len(registry) == 0 {
		return errors.New("no migrations are registered")
	}
	copyOfRegistry := append([]migration(nil), registry...)
	sort.Slice(copyOfRegistry, func(i, j int) bool { return copyOfRegistry[i].Version < copyOfRegistry[j].Version })
	for i, item := range copyOfRegistry {
		if item.Version != i+1 {
			return fmt.Errorf("migration versions must be contiguous from 1; found %d at position %d", item.Version, i)
		}
		if strings.TrimSpace(item.Name) == "" || len(item.Statements) == 0 {
			return fmt.Errorf("migration %d must have a name and at least one statement", item.Version)
		}
		if item.Version != registry[i].Version {
			return errors.New("migrations must be registered in ascending version order")
		}
	}
	return nil
}
