package database

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/require"
)

var expectedIndexes = []string{
	"idx_postings_transaction_id",
	"idx_postings_forecast_date",
	"idx_postings_account_forecast",
	"idx_postings_commodity",
	"idx_prices_date",
	"idx_prices_type_name_id",
	"idx_caches_hash_key",
}

func TestInitializeBrandNewDatabase(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	sqlDB := openRawDB(t, dbPath)
	defer func() { require.NoError(t, sqlDB.Close()) }()
	for table := range baselineColumns {
		requireObjectExists(t, sqlDB, "table", table)
	}
	requireObjectExists(t, sqlDB, "table", "schema_migrations")
	for _, index := range expectedIndexes {
		requireObjectExists(t, sqlDB, "index", index)
	}
	requireMigrationVersions(t, sqlDB, 1, 2)
}

func TestInitializeAdoptsV090DatabaseWithoutChangingData(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	sqlDB := createLegacyDatabase(t, dbPath, false)
	seedRepresentativeData(t, sqlDB)
	before := snapshotData(t, sqlDB)
	require.NoError(t, sqlDB.Close())

	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	sqlDB = openRawDB(t, dbPath)
	defer func() { require.NoError(t, sqlDB.Close()) }()
	require.Equal(t, before, snapshotData(t, sqlDB))
	requireMigrationVersions(t, sqlDB, 1, 2)
	for _, index := range expectedIndexes {
		requireObjectExists(t, sqlDB, "index", index)
	}
}

func TestInitializeAdoptsPreviouslyIndexedV091Database(t *testing.T) {
	for _, existingIndexCount := range []int{1, len(expectedIndexes)} {
		t.Run(string(rune('0'+existingIndexCount))+" existing indexes", func(t *testing.T) {
			dbPath := filepath.Join(t.TempDir(), "paisa.db")
			sqlDB := createLegacyDatabase(t, dbPath, false)
			seedRepresentativeData(t, sqlDB)
			for _, statement := range migrations[1].Statements[:existingIndexCount] {
				_, err := sqlDB.Exec(statement)
				require.NoError(t, err)
			}
			before := snapshotData(t, sqlDB)
			require.NoError(t, sqlDB.Close())

			db, err := initializePath(context.Background(), dbPath, migrations)
			require.NoError(t, err)
			closeGormDB(t, db)

			sqlDB = openRawDB(t, dbPath)
			defer func() { require.NoError(t, sqlDB.Close()) }()
			require.Equal(t, before, snapshotData(t, sqlDB))
			for _, index := range expectedIndexes {
				requireObjectExists(t, sqlDB, "index", index)
			}
		})
	}
}

func TestInitializeIsIdempotent(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	for range 2 {
		db, err := initializePath(context.Background(), dbPath, migrations)
		require.NoError(t, err)
		closeGormDB(t, db)
	}

	sqlDB := openRawDB(t, dbPath)
	defer func() { require.NoError(t, sqlDB.Close()) }()
	requireMigrationVersions(t, sqlDB, 1, 2)
	var count int
	require.NoError(t, sqlDB.QueryRow("SELECT count(*) FROM schema_migrations").Scan(&count))
	require.Equal(t, 2, count)
}

func TestFailedMigrationRollsBackAndRetries(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	failing := append([]migration(nil), migrations...)
	failing = append(failing, migration{
		Version:    3,
		Name:       "test_failure",
		Statements: []string{"CREATE TABLE should_roll_back (id INTEGER)", "THIS IS NOT SQL"},
	})
	_, err = initializePath(context.Background(), dbPath, failing)
	require.ErrorContains(t, err, "apply migration 3")

	sqlDB := openRawDB(t, dbPath)
	requireObjectMissing(t, sqlDB, "table", "should_roll_back")
	requireMigrationVersions(t, sqlDB, 1, 2)
	require.NoError(t, sqlDB.Close())

	retry := append([]migration(nil), migrations...)
	retry = append(retry, migration{Version: 3, Name: "test_failure", Statements: []string{"CREATE TABLE retry_succeeded (id INTEGER)"}})
	db, err = initializePath(context.Background(), dbPath, retry)
	require.NoError(t, err)
	closeGormDB(t, db)
	sqlDB = openRawDB(t, dbPath)
	defer func() { require.NoError(t, sqlDB.Close()) }()
	requireObjectExists(t, sqlDB, "table", "retry_succeeded")
	requireMigrationVersions(t, sqlDB, 1, 2, 3)
}

func TestConcurrentInitializationUsesSQLiteLock(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	start := make(chan struct{})
	errors := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			db, err := initializePath(context.Background(), dbPath, migrations)
			if err == nil {
				closeDB, closeErr := db.DB()
				if closeErr == nil {
					closeErr = closeDB.Close()
				}
				if closeErr != nil {
					err = closeErr
				}
			}
			errors <- err
		}()
	}
	close(start)
	wg.Wait()
	close(errors)
	for err := range errors {
		require.NoError(t, err)
	}

	sqlDB := openRawDB(t, dbPath)
	defer func() { require.NoError(t, sqlDB.Close()) }()
	requireMigrationVersions(t, sqlDB, 1, 2)
}

func TestRejectsNewerDatabaseSchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	sqlDB := openRawDB(t, dbPath)
	_, err = sqlDB.Exec("INSERT INTO schema_migrations(version, name, applied_at, checksum) VALUES (3, 'future', CURRENT_TIMESTAMP, 'future')")
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = initializePath(context.Background(), dbPath, migrations)
	require.ErrorContains(t, err, "schema is newer")
	require.ErrorContains(t, err, dbPath)
	require.ErrorContains(t, err, "highest supported schema 2")
}

func TestRejectsMigrationChecksumMismatch(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	sqlDB := openRawDB(t, dbPath)
	_, err = sqlDB.Exec("UPDATE schema_migrations SET checksum = 'changed' WHERE version = 2")
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = initializePath(context.Background(), dbPath, migrations)
	require.ErrorContains(t, err, "migration 2 (v0_9_1_indexes) checksum mismatch")
	require.ErrorContains(t, err, "expected")
	require.ErrorContains(t, err, "stored changed")
	require.ErrorContains(t, err, dbPath)
}

func TestRejectsMigrationHistoryGap(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)

	sqlDB := openRawDB(t, dbPath)
	_, err = sqlDB.Exec("DELETE FROM schema_migrations WHERE version = 1")
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = initializePath(context.Background(), dbPath, migrations)
	require.ErrorContains(t, err, "unsupported or incomplete migration history at version 2")
	require.ErrorContains(t, err, dbPath)
}

func TestRejectsIncompleteLegacySchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	sqlDB := openRawDB(t, dbPath)
	_, err := sqlDB.Exec("CREATE TABLE postings (id INTEGER PRIMARY KEY)")
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = initializePath(context.Background(), dbPath, migrations)
	require.ErrorContains(t, err, "cannot adopt legacy database")
	require.ErrorContains(t, err, "required baseline")
}

func TestReadonlyDatabaseReturnsActionableError(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix file modes are not available")
	}
	dbPath := filepath.Join(t.TempDir(), "paisa.db")
	db, err := initializePath(context.Background(), dbPath, migrations)
	require.NoError(t, err)
	closeGormDB(t, db)
	require.NoError(t, os.Chmod(dbPath, 0o400))
	t.Cleanup(func() { _ = os.Chmod(dbPath, 0o600) })

	_, err = initializePath(context.Background(), dbPath, migrations)
	if err == nil {
		t.Skip("test environment can write files marked read-only")
	}
	require.Contains(t, err.Error(), dbPath)
	require.Contains(t, strings.ToLower(err.Error()), "writable persistent storage")
}

func TestReadonlyParentDirectoryReturnsActionableError(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix file modes are not available")
	}
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "paisa.db")
	require.NoError(t, os.Chmod(dir, 0o500))
	t.Cleanup(func() { _ = os.Chmod(dir, 0o700) })

	_, err := initializePath(context.Background(), dbPath, migrations)
	if err == nil {
		t.Skip("test environment can write directories marked read-only")
	}
	require.Contains(t, err.Error(), dbPath)
	require.Contains(t, err.Error(), dir)
	require.Contains(t, strings.ToLower(err.Error()), "writable persistent storage")
}

func createLegacyDatabase(t *testing.T, dbPath string, withIndexes bool) *sql.DB {
	t.Helper()
	db := openRawDB(t, dbPath)
	for _, statement := range migrations[0].Statements {
		_, err := db.Exec(statement)
		require.NoError(t, err)
	}
	if withIndexes {
		for _, statement := range migrations[1].Statements {
			_, err := db.Exec(statement)
			require.NoError(t, err)
		}
	}
	return db
}

func openRawDB(t *testing.T, dbPath string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", sqliteDSN(dbPath))
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func closeGormDB(t *testing.T, db interface{ DB() (*sql.DB, error) }) {
	t.Helper()
	sqlDB, err := db.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())
}

func requireObjectExists(t *testing.T, db *sql.DB, objectType, name string) {
	t.Helper()
	var count int
	require.NoError(t, db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type = ? AND name = ?", objectType, name).Scan(&count))
	require.Equal(t, 1, count, "%s %s should exist", objectType, name)
}

func requireObjectMissing(t *testing.T, db *sql.DB, objectType, name string) {
	t.Helper()
	var count int
	require.NoError(t, db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type = ? AND name = ?", objectType, name).Scan(&count))
	require.Zero(t, count, "%s %s should not exist", objectType, name)
}

func requireMigrationVersions(t *testing.T, db *sql.DB, expected ...int) {
	t.Helper()
	rows, err := db.Query("SELECT version FROM schema_migrations ORDER BY version")
	require.NoError(t, err)
	defer func() { require.NoError(t, rows.Close()) }()
	var actual []int
	for rows.Next() {
		var version int
		require.NoError(t, rows.Scan(&version))
		actual = append(actual, version)
	}
	require.NoError(t, rows.Err())
	require.Equal(t, expected, actual)
}

func seedRepresentativeData(t *testing.T, db *sql.DB) {
	t.Helper()
	statements := []string{
		"INSERT INTO postings(id, transaction_id, account, commodity, quantity, amount, forecast) VALUES (1, 'txn-1', 'Assets:Cash', 'INR', '10', '10', 0)",
		"INSERT INTO prices(id, commodity_type, commodity_id, commodity_name, value) VALUES (1, 'stock', 'ABC', 'ABC Ltd', '123.45')",
		"INSERT INTO caches(id, expires_at, hash_key, value) VALUES (1, '2030-01-01', 'key', X'0102')",
		"INSERT INTO portfolios(id, commodity_type, parent_commodity_id, security_id, security_name, percentage) VALUES (1, 'mutualfund', 'MF1', 'SEC1', 'Security', '50')",
		"INSERT INTO ciis(id, financial_year, cost_inflation_index) VALUES (1, '2025-26', 376)",
	}
	for _, statement := range statements {
		_, err := db.Exec(statement)
		require.NoError(t, err)
	}
}

func snapshotData(t *testing.T, db *sql.DB) map[string]string {
	t.Helper()
	queries := map[string]string{
		"postings":   "SELECT transaction_id || '|' || account || '|' || amount FROM postings WHERE id = 1",
		"prices":     "SELECT commodity_type || '|' || commodity_id || '|' || value FROM prices WHERE id = 1",
		"caches":     "SELECT hash_key || '|' || hex(value) FROM caches WHERE id = 1",
		"portfolios": "SELECT parent_commodity_id || '|' || security_id || '|' || percentage FROM portfolios WHERE id = 1",
		"ciis":       "SELECT financial_year || '|' || cost_inflation_index FROM ciis WHERE id = 1",
	}
	result := make(map[string]string, len(queries))
	for name, query := range queries {
		var value string
		require.NoError(t, db.QueryRow(query).Scan(&value))
		result[name] = value
	}
	return result
}
