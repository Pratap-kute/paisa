package server

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/ledger"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/bmatcuk/doublestar/v4"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type LedgerFile = dto.LedgerFileResponse

func GetFiles(db *gorm.DB) dto.EditorFilesResponse {
	var accounts []string
	var payees []string
	var commodities []string
	db.Model(&posting.Posting{}).Distinct().Pluck("Account", &accounts)
	db.Model(&posting.Posting{}).Distinct().Pluck("Payee", &payees)
	db.Model(&posting.Posting{}).Distinct().Pluck("Commodity", &commodities)
	sort.Strings(accounts)
	sort.Strings(commodities)

	path := config.GetJournalPath()
	if err := ensureJournalFile(path, config.GetConfig().Readonly); err != nil {
		log.Warn("Failed to initialize journal file: ", err)
	}

	dir := filepath.Dir(path)
	paths, _ := doublestar.FilepathGlob(dir + "/**/*" + filepath.Ext(path))
	files := make([]*LedgerFile, 0, len(paths))

	for _, path = range paths {
		lf, err := readLedgerFileWithVersions(dir, path)
		if err == nil {
			files = append(files, lf)
		} else {
			log.Warn("Failed to read ledger file: ", path, err)
		}
	}

	return dto.EditorFilesResponse{Files: files, Accounts: accounts, Payees: payees, Commodities: commodities}
}

func ensureJournalFile(path string, readonly bool) error {
	if readonly {
		return nil
	}

	_, err := os.Stat(path)
	if err == nil {
		return nil
	}
	if !os.IsNotExist(err) {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}
	//nolint:gosec // user requested ledger file creation
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if os.IsExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return file.Close()
}

func GetFile(file LedgerFile) (gin.H, error) {
	path := config.GetJournalPath()
	dir := filepath.Dir(path)
	filePath, err := utils.BuildSubPath(dir, file.Name)
	if err != nil {
		return nil, err
	}
	lf, err := readLedgerFile(dir, filePath)
	if err != nil {
		return nil, err
	}
	return gin.H{"file": lf}, nil
}

func DeleteBackups(file LedgerFile) (gin.H, error) {
	path := config.GetJournalPath()
	dir := filepath.Dir(path)
	filePath, err := utils.BuildSubPath(dir, file.Name)
	if err != nil {
		return nil, err
	}

	if !config.GetConfig().Readonly {
		versions, _ := filepath.Glob(filepath.Join(filepath.Dir(filePath), filepath.Base(filePath)+".backup.*"))
		for _, version := range versions {
			err := os.Remove(version)
			if err != nil {
				return nil, err
			}
		}
	}

	lf, err := readLedgerFileWithVersions(dir, filePath)
	if err != nil {
		return nil, err
	}
	return gin.H{"file": lf}, nil
}

func SaveFile(db *gorm.DB, file LedgerFile) gin.H {
	errors, _, err := validateFile(file)
	if err != nil {
		msg := "Validation failed"
		if len(errors) > 0 && errors[0].Message != "" {
			msg = fmt.Sprintf("Validation failed at Line %d: %s", errors[0].LineFrom, strings.TrimSpace(errors[0].Message))
		}
		return gin.H{"errors": errors, "saved": false, "synced": false, "message": msg}
	}

	path := config.GetJournalPath()
	dir := filepath.Dir(path)

	filePath, err := utils.BuildSubPath(dir, file.Name)
	if err != nil {
		log.Warn(err)
		return gin.H{"errors": errors, "saved": false, "synced": false, "message": "Invalid file name"}
	}

	backupPath := filePath + ".backup." + time.Now().Format("2006-01-02-15-04-05.000")

	err = os.MkdirAll(filepath.Dir(filePath), 0o700)
	if err != nil {
		log.Warn(err)
		return gin.H{"errors": errors, "saved": false, "synced": false, "message": "Failed to create directory"}
	}

	fileStat, err := os.Stat(filePath)
	if err != nil && file.Operation != "overwrite" && file.Operation != "create" {
		log.Warn(err)
		return gin.H{"errors": errors, "saved": false, "synced": false, "message": "File does not exist"}
	}

	var perm os.FileMode = 0o644
	if err == nil {
		if file.Operation == "create" {
			return gin.H{"errors": errors, "saved": false, "synced": false, "message": "File already exists"}
		}

		perm = fileStat.Mode().Perm()
		//nolint:gosec // user requested ledger file read
		existingContent, err := os.ReadFile(filePath)
		if err != nil {
			log.Warn(err)
			return gin.H{"errors": errors, "saved": false, "synced": false, "message": "Failed to read file"}
		}

		err = os.WriteFile(backupPath, existingContent, perm)
		if err != nil {
			log.Warn(err)
			return gin.H{"errors": errors, "saved": false, "synced": false, "message": "Failed to create backup"}
		}
	}

	err = utils.AtomicWriteFile(filePath, []byte(file.Content), perm)
	if err != nil {
		log.Warn(err)
		return gin.H{"errors": errors, "saved": false, "synced": false, "message": "Failed to write file"}
	}

	syncResult := Sync(db, SyncRequest{Journal: true})

	lf, _ := readLedgerFileWithVersions(dir, filePath)
	if !syncResult.Success {
		return gin.H{
			"errors":  errors,
			"saved":   true,
			"synced":  false,
			"file":    lf,
			"message": fmt.Sprintf("Journal saved, but sync failed: %s", syncResult.Message),
		}
	}

	return gin.H{"errors": errors, "saved": true, "synced": true, "file": lf}
}

func ValidateFile(file LedgerFile) gin.H {
	errors, output, _ := validateFile(file)
	return gin.H{"errors": errors, "output": output}
}

func validateFile(file LedgerFile) ([]ledger.LedgerFileError, string, error) {
	path := config.GetJournalPath()

	tmpfile, err := os.CreateTemp(filepath.Dir(path), "paisa-tmp-")
	if err != nil {
		return nil, "", err
	}

	defer func() { _ = os.Remove(tmpfile.Name()) }()

	if _, err := tmpfile.Write([]byte(file.Content)); err != nil {
		return nil, "", err
	}

	if err := tmpfile.Close(); err != nil {
		return nil, "", err
	}

	return ledger.Cli().ValidateFile(tmpfile.Name())
}

func readLedgerFile(dir string, path string) (*LedgerFile, error) {
	//nolint:gosec // user requested ledger file read
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	name, err := filepath.Rel(dir, path)
	if err != nil {
		return nil, err
	}

	return &LedgerFile{
		Name:    name,
		Content: string(content),
	}, nil
}

func readLedgerFileWithVersions(dir string, path string) (*LedgerFile, error) {
	//nolint:gosec // user requested ledger file read
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	versions, _ := filepath.Glob(filepath.Join(filepath.Dir(path), filepath.Base(path)+".backup.*"))
	versionPaths := make([]string, 0, len(versions))
	for _, version := range versions {
		name, err := filepath.Rel(dir, version)
		if err != nil {
			return nil, err
		}
		versionPaths = append(versionPaths, name)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(versionPaths)))

	name, err := filepath.Rel(dir, path)
	if err != nil {
		return nil, err
	}

	return &LedgerFile{
		Name:     name,
		Content:  string(content),
		Versions: versionPaths,
	}, nil
}
