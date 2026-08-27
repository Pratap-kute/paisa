package cmd

import (
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/adrg/xdg"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/generator"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"gopkg.in/natefinch/lumberjack.v2"
)

type LumberjackLogrusHook struct {
	Writer    *lumberjack.Logger
	LogLevels []log.Level
	Formatter log.Formatter
}

func (h *LumberjackLogrusHook) Levels() []log.Level {
	return h.LogLevels
}

func (h *LumberjackLogrusHook) Fire(entry *log.Entry) error {
	line, err := h.Formatter.Format(entry)
	if err != nil {
		return err
	}
	_, err = h.Writer.Write(line)
	return err
}

var (
	configFile string
	now        string
)

var rootCmd = &cobra.Command{
	Use:           "paisa",
	Short:         "Personal finance manager",
	SilenceErrors: true,
	SilenceUsage:  true,
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		log.Fatal(err)
	}
}

func init() {
	cobra.OnInitialize(Initialize)
	rootCmd.PersistentFlags().StringVar(&configFile, "config", "", "config file (default is ./paisa.yaml)")
	rootCmd.PersistentFlags().StringVar(&now, "now", "", "set the current date (default is today)")
}

func Initialize() {
	InitLogger(false, nil)
	if now != "" {
		utils.SetNow(now)
	}
	currentCommand, _, _ := rootCmd.Find(os.Args[1:])

	if !lo.Contains([]string{"serve", "update"}, currentCommand.Name()) {
		return
	}

	InitConfig()
}

const envTrue = "true"

func InitLogger(desktop bool, hook log.Hook) {
	formatter := log.TextFormatter{
		DisableTimestamp: true,
		ForceColors:      !desktop,
		DisableColors:    desktop,
		PadLevelText:     true,
	}
	if os.Getenv("PAISA_DEBUG") == envTrue {
		log.SetReportCaller(true)
		log.SetLevel(log.DebugLevel)
		formatter.CallerPrettyfier = func(f *runtime.Frame) (string, string) {
			s := strings.Split(f.Function, ".")
			funcName := s[len(s)-1]
			return funcName, fmt.Sprintf(" [%s:%d]", path.Base(f.File), f.Line)
		}
	}

	if desktop && os.Getenv("PAISA_DEBUG") != envTrue {
		log.SetReportCaller(true)
	}

	if os.Getenv("PAISA_DISABLE_LOG_FILE") != envTrue {
		p, err := config.EnsureLogFilePath()
		if err == nil {
			log.AddHook(&LumberjackLogrusHook{
				Writer: &lumberjack.Logger{
					Filename:   p,
					MaxSize:    50,
					MaxBackups: 7,
					MaxAge:     30,
				},
				LogLevels: []log.Level{
					log.PanicLevel,
					log.FatalLevel,
					log.ErrorLevel,
					log.WarnLevel,
					log.InfoLevel,
				},
				Formatter: &log.JSONFormatter{},
			})
		}
	}

	if desktop {
		log.SetOutput(io.Discard)
	} else {
		log.SetFormatter(&formatter)
	}

	if hook != nil {
		log.AddHook(hook)
	}
}

func InitConfig() {
	lang := os.Getenv("LANG")
	if lang == "" {
		lang = "en_US.UTF-8"
		err := os.Setenv("LANG", lang)
		if err != nil {
			log.Warnf("Failed to set LANG: %s", err.Error())
		} else {
			log.Infof("Set LANG to %s", lang)
		}
	}

	xdgDocumentDir := filepath.Join(xdg.UserDirs.Documents, "paisa")
	xdgDocumentPath := filepath.Join(xdgDocumentDir, "paisa.yaml")
	switch {
	case os.Getenv("PAISA_CONFIG") != "":
		config.LoadConfigFile(os.Getenv("PAISA_CONFIG"))
	case configFile != "":
		config.LoadConfigFile(configFile)
	case utils.FileExists("paisa.yaml"):
		config.LoadConfigFile("paisa.yaml")
	case utils.FileExists(xdgDocumentPath):
		config.LoadConfigFile(xdgDocumentPath)
	default:
		err := os.MkdirAll(xdgDocumentDir, 0o750)
		if err != nil {
			log.Fatal(err)
		}
		if err := generator.MinimalConfig(xdgDocumentDir); err != nil {
			log.Fatal(err)
		}
		config.LoadConfigFile(xdgDocumentPath)
	}
}
