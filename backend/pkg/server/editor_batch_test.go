package server

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/stretchr/testify/require"
)

func batchFixture(t *testing.T) (dto.EditorSaveRequest, []string) {
	t.Helper()
	setupEditorTest(t)
	dir := filepath.Dir(config.GetJournalPath())
	request := dto.EditorSaveRequest{}
	paths := []string{}
	for _, name := range []string{"one.ledger", "two.ledger"} {
		original := "original " + name
		path := filepath.Join(dir, name)
		require.NoError(t, os.WriteFile(path, []byte(original), 0o600))
		request.Files = append(request.Files, &LedgerFile{Name: name, Content: "tagged " + name, ExpectedContent: &original})
		paths = append(paths, path)
	}
	return request, paths
}

func TestEditorBatchPreflightAndRollback(t *testing.T) {
	for _, failure := range []string{"stale", "validation", "write", "sync", "restore", "success"} {
		t.Run(failure, func(t *testing.T) {
			request, paths := batchFixture(t)
			writes, syncs := 0, 0
			if failure == "stale" {
				stale := "stale"
				request.Files[1].ExpectedContent = &stale
			}
			result := saveFiles(request, batchOperations{
				validate: func(file LedgerFile) error {
					if failure == "validation" && file.Name == "two.ledger" {
						return errors.New("invalid journal")
					}
					return nil
				},
				write: func(path string, content []byte, perm os.FileMode) error {
					writes++
					if (failure == "write" || failure == "restore") && writes == 2 {
						return errors.New("disk failed")
					}
					if failure == "restore" && writes == 3 {
						return errors.New("restore failed")
					}
					return utils.AtomicWriteFile(path, content, perm)
				},
				sync: func() SyncResult {
					syncs++
					if failure == "sync" && syncs == 1 {
						return SyncResult{Message: "sync failed"}
					}
					return SyncResult{Success: true}
				},
			})
			if failure == "success" {
				require.True(t, result.Saved)
				require.Equal(t, 1, syncs)
				return
			}
			require.False(t, result.Saved)
			if failure == "restore" {
				require.False(t, result.RolledBack)
				require.Contains(t, result.RecoveryFiles, "one.ledger")
				return
			}
			for i, path := range paths {
				data, err := os.ReadFile(path)
				require.NoError(t, err)
				require.Equal(t, "original "+request.Files[i].Name, string(data))
			}
			if failure == "stale" || failure == "validation" {
				require.Zero(t, writes)
				require.Zero(t, syncs)
			}
			if failure == "write" {
				require.True(t, result.RolledBack)
				require.Zero(t, syncs)
			}
			if failure == "sync" {
				require.True(t, result.RolledBack)
				require.Equal(t, 2, syncs)
			}
		})
	}
}

func TestEditorBatchRealLedgerSync(t *testing.T) {
	db, dir, main := setupIntegrityTestEnv(t)
	original := "2021/01/08 Netflix\n    Expenses:Entertainment  499 INR\n    Assets:Checking\n"
	require.NoError(t, os.WriteFile(main, []byte("include one.ledger\ninclude two.ledger\n"), 0o600))
	request := dto.EditorSaveRequest{}
	for _, name := range []string{"one.ledger", "two.ledger"} {
		require.NoError(t, os.WriteFile(filepath.Join(dir, name), []byte(original), 0o600))
		request.Files = append(request.Files, &LedgerFile{Name: name, ExpectedContent: &original, Content: "2021/01/08 Netflix\n    ; Recurring: netflix\n    Expenses:Entertainment  499 INR\n    Assets:Checking\n"})
	}
	result := SaveFiles(db, request)
	require.True(t, result.Saved, result.Message)
	require.True(t, result.Synced, result.Message)
	sequences := GetRecurringTransactions(db)
	require.Len(t, sequences.TransactionSequences, 1)
	require.Len(t, sequences.TransactionSequences[0].Transactions, 2)
	require.True(t, Sync(db, SyncRequest{Journal: true}).Success)
	require.Len(t, GetRecurringTransactions(db).TransactionSequences[0].Transactions, 2)
}

func TestEditorBatchRejectsUnsafeRequests(t *testing.T) {
	for _, scenario := range []string{"empty", "missing revision", "operation", "duplicate", "outside root"} {
		t.Run(scenario, func(t *testing.T) {
			request, _ := batchFixture(t)
			switch scenario {
			case "empty":
				request.Files = nil
			case "missing revision":
				request.Files[0].ExpectedContent = nil
			case "operation":
				request.Files[0].Operation = "delete"
			case "duplicate":
				request.Files = append(request.Files, request.Files[0])
			case "outside root":
				request.Files[0].Name = "../outside.ledger"
			}
			result := saveFiles(request, batchOperations{
				validate: func(LedgerFile) error { t.Fatal("invalid request reached validation"); return nil },
				write:    func(string, []byte, os.FileMode) error { t.Fatal("invalid request reached writing"); return nil },
				sync:     func() SyncResult { t.Fatal("invalid request reached sync"); return SyncResult{} },
			})
			require.False(t, result.Saved)
			require.NotEmpty(t, result.Message)
		})
	}
}
