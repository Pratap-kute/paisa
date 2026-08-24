package server

import (
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/bmatcuk/doublestar/v4"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const (
	Extension   = ".paisa"
	opCreate    = "create"
	opOverwrite = "overwrite"
)

type SheetFile struct {
	Name      string   `json:"name"`
	Content   string   `json:"content"`
	Versions  []string `json:"versions"`
	Operation string   `json:"operation"`
}

func GetSheets(db *gorm.DB) gin.H {
	dir := config.GetSheetDir()
	paths, _ := doublestar.FilepathGlob(dir + "/**/*" + Extension)

	files := make([]*SheetFile, 0, len(paths))
	for _, path := range paths {
		sf, err := readSheetFileWithVersions(dir, path)
		if err == nil {
			files = append(files, sf)
		} else {
			log.Warn("Failed to read sheet file: ", path, err)
		}
	}

	postings := query.Init(db).All()
	postings = service.PopulateMarketPrice(db, postings)

	return gin.H{"files": files, "postings": postings}
}

func GetSheet(file SheetFile) (gin.H, error) {
	dir := config.GetSheetDir()
	filePath, err := utils.BuildSubPath(dir, file.Name)
	if err != nil {
		return nil, err
	}
	sf, err := readSheetFile(dir, filePath)
	if err != nil {
		return nil, err
	}
	return gin.H{"file": sf}, nil
}

func DeleteSheetBackups(file SheetFile) (gin.H, error) {
	dir := config.GetSheetDir()
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

	sf, err := readSheetFileWithVersions(dir, filePath)
	if err != nil {
		return nil, err
	}
	return gin.H{"file": sf}, nil
}

func SaveSheetFile(db *gorm.DB, file SheetFile) gin.H {
	dir := config.GetSheetDir()

	filePath, err := utils.BuildSubPath(dir, file.Name)
	if err != nil {
		log.Warn(err)
		return gin.H{"saved": false, "message": "Invalid file name"}
	}

	backupPath := filePath + ".backup." + time.Now().Format("2006-01-02-15-04-05.000")

	err = os.MkdirAll(filepath.Dir(filePath), 0o700)
	if err != nil {
		log.Warn(err)
		return gin.H{"saved": false, "message": "Failed to create directory"}
	}

	fileStat, err := os.Stat(filePath)
	if err != nil && file.Operation != opOverwrite && file.Operation != opCreate {
		log.Warn(err)
		return gin.H{"saved": false, "message": "File does not exist"}
	}

	var perm os.FileMode = 0o644
	if err == nil {
		if file.Operation == opCreate {
			return gin.H{"saved": false, "message": "File already exists"}
		}

		perm = fileStat.Mode().Perm()
		//nolint:gosec // user requested sheet file read
		existingContent, err := os.ReadFile(filePath)
		if err != nil {
			log.Warn(err)
			return gin.H{"saved": false, "message": "Failed to read file"}
		}

		err = os.WriteFile(backupPath, existingContent, perm)
		if err != nil {
			log.Warn(err)
			return gin.H{"saved": false, "message": "Failed to create backup"}
		}
	}

	err = os.WriteFile(filePath, []byte(file.Content), perm)
	if err != nil {
		log.Warn(err)
		return gin.H{"saved": false, "message": "Failed to write file"}
	}

	sf, _ := readSheetFileWithVersions(dir, filePath)
	return gin.H{"saved": true, "file": sf}
}

func readSheetFile(dir string, path string) (*SheetFile, error) {
	//nolint:gosec // user requested sheet file read
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	name, err := filepath.Rel(dir, path)
	if err != nil {
		return nil, err
	}

	return &SheetFile{
		Name:    name,
		Content: string(content),
	}, nil
}

func readSheetFileWithVersions(dir string, path string) (*SheetFile, error) {
	//nolint:gosec // user requested sheet file read
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

	return &SheetFile{
		Name:     name,
		Content:  string(content),
		Versions: versionPaths,
	}, nil
}
