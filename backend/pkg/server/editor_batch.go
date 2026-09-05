package server

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type batchFile struct {
	file     LedgerFile
	path     string
	original []byte
	perm     os.FileMode
	backup   string
}

type batchOperations struct {
	validate func(LedgerFile) error
	write    func(string, []byte, os.FileMode) error
	sync     func() SyncResult
}

// SaveFiles shares the editor write lock and restores earlier files on a failed
// write or synchronization. Backups remain available if restoration itself fails.
// This is failure rollback, not a crash-atomic filesystem transaction.
func SaveFiles(db *gorm.DB, request dto.EditorSaveRequest) dto.EditorBatchSaveResponse {
	ledgerWriteMu.Lock()
	defer ledgerWriteMu.Unlock()
	if config.GetConfig().Readonly {
		return dto.EditorBatchSaveResponse{Message: "Readonly mode"}
	}
	return saveFiles(request, batchOperations{
		validate: func(file LedgerFile) error { _, _, err := validateFile(file); return err },
		write:    utils.AtomicWriteFile,
		sync:     func() SyncResult { return Sync(db, SyncRequest{Journal: true}) },
	})
}

func saveFiles(request dto.EditorSaveRequest, ops batchOperations) dto.EditorBatchSaveResponse {
	failure := func(message string) dto.EditorBatchSaveResponse { return dto.EditorBatchSaveResponse{Message: message} }
	if len(request.Files) == 0 {
		return failure("No files supplied")
	}
	dir := filepath.Dir(config.GetJournalPath())
	files := make([]batchFile, 0, len(request.Files))
	seen := make(map[string]bool)
	for _, file := range request.Files {
		if file == nil || file.ExpectedContent == nil || file.Operation != "" {
			return failure("Batch saves require existing files with expected_content and no operation")
		}
		path, err := utils.BuildSubPath(dir, file.Name)
		if err != nil {
			return failure("Invalid file name")
		}
		resolved, err := filepath.EvalSymlinks(path)
		if err != nil {
			return failure("Could not resolve " + file.Name)
		}
		if seen[resolved] {
			return failure("Duplicate file in batch")
		}
		seen[resolved] = true
		path = resolved
		//nolint:gosec // BuildSubPath validates this editor source path.
		original, err := os.ReadFile(path)
		if err != nil || string(original) != *file.ExpectedContent {
			return failure("Source changed: " + file.Name + ". Reload before confirming.")
		}
		stat, err := os.Stat(path)
		if err != nil || !stat.Mode().IsRegular() {
			return failure("Invalid source file: " + file.Name)
		}
		files = append(files, batchFile{file: *file, path: path, original: original, perm: stat.Mode().Perm()})
	}
	// Complete preflight before creating any backups or changing source files.
	for i := range files {
		file := &files[i]
		if err := ops.validate(file.file); err != nil {
			return failure("Validation failed for " + file.file.Name + ": " + err.Error())
		}
	}
	for i := range files {
		file := &files[i]
		backup, err := os.CreateTemp(filepath.Dir(file.path), filepath.Base(file.path)+".backup."+time.Now().Format("2006-01-02-15-04-05")+"-*")
		if err != nil {
			return failure("Could not create backup for " + file.file.Name)
		}
		file.backup = backup.Name()
		_, writeErr := backup.Write(file.original)
		syncErr := backup.Sync()
		closeErr := backup.Close()
		if writeErr != nil || syncErr != nil || closeErr != nil {
			return failure("Could not finish backup for " + file.file.Name)
		}
	}
	// Recheck every revision after potentially slow validation and backup I/O.
	for i := range files {
		file := &files[i]
		current, err := os.ReadFile(file.path)
		if err != nil || string(current) != string(file.original) {
			return failure("Source changed: " + file.file.Name + ". No batch edits applied.")
		}
	}
	written := 0

	for i := range files {
		file := &files[i]
		current, err := os.ReadFile(file.path)
		if err != nil || string(current) != string(file.original) {
			return rollbackFiles(files[:written], ops, "Source changed: "+file.file.Name, false)
		}
		if err := ops.write(file.path, []byte(file.file.Content), file.perm); err != nil {
			return rollbackFiles(files[:written], ops, "Write failed for "+file.file.Name+": "+err.Error(), false)
		}
		written++
	}
	if result := ops.sync(); !result.Success {
		return rollbackFiles(files[:written], ops, "Synchronization failed: "+result.Message, true)
	}
	return dto.EditorBatchSaveResponse{Saved: true, Synced: true, Message: fmt.Sprintf("Saved %d files", len(files))}
}

func rollbackFiles(files []batchFile, ops batchOperations, reason string, resync bool) dto.EditorBatchSaveResponse {
	recovery := make(map[string]string)
	for i := len(files) - 1; i >= 0; i-- {
		file := files[i]
		// Do not overwrite a concurrent external editor's changes during recovery.
		current, err := os.ReadFile(file.path)
		if err != nil || string(current) != file.file.Content {
			recovery[file.file.Name] = file.backup
			continue
		}
		if err := ops.write(file.path, file.original, file.perm); err != nil {
			recovery[file.file.Name] = file.backup
		}
	}
	result := dto.EditorBatchSaveResponse{RolledBack: len(recovery) == 0, RecoveryFiles: recovery, Message: reason}
	if len(recovery) > 0 {
		result.Message += ". Restoration needs attention; original backups are listed in recovery_files. Do not retry until restored."
	} else {
		result.Message += ". All batch edits were restored; reload and retry."
		if resync {
			if syncResult := ops.sync(); !syncResult.Success {
				result.Message += " Journal restored but database synchronization failed: " + syncResult.Message
			}
		}
	}
	return result
}

// SaveEditorFilesHandler godoc
// @ID saveEditorFiles
// @Summary Save existing ledger files together with failure rollback
// @Description Checks all source revisions, validates, backs up, writes and synchronizes once. Restores earlier writes on failure; recovery_files identifies backups if restoration fails. Not crash-atomic.
// @Tags Editor
// @Accept json
// @Produce json
// @Param files body dto.EditorSaveRequest true "Existing files and expected source content"
// @Success 200 {object} dto.EditorBatchSaveResponse
// @Failure 400 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /editor/save_batch [post]
func SaveEditorFilesHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request dto.EditorSaveRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			status, body := mapBindingOrFileError(err)
			c.JSON(status, body)
			return
		}
		c.JSON(200, SaveFiles(db, request))
	}
}
