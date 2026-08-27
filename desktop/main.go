package main

import (
	_ "embed"
	"os"

	"github.com/ananthakumaran/paisa/cmd"
	"github.com/ananthakumaran/paisa/desktop/logger"
	"github.com/ananthakumaran/paisa/pkg/server"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed build/appicon.png
var icon []byte

func main() {
	decimal.MarshalJSONWithoutQuotes = true
	// Set the GPU policy for Linux based on the environment variable "PAISA_GPU_POLICY"
	linuxGpuPolicy := linux.WebviewGpuPolicyOnDemand

	if gpuPolicyConfig := os.Getenv("PAISA_GPU_POLICY"); gpuPolicyConfig != "" {
		switch gpuPolicyConfig {
		case "always":
			linuxGpuPolicy = linux.WebviewGpuPolicyAlways
		case "never":
			linuxGpuPolicy = linux.WebviewGpuPolicyNever
		case "ondemand":
			linuxGpuPolicy = linux.WebviewGpuPolicyOnDemand
		default:
			log.Warnf("Unknown gpuPolicy: %s", gpuPolicyConfig)
		}
	}

	app := NewApp()

	cmd.InitLogger(true, &logger.Hook{
		Ctx: &app.ctx,
		LogLevels: []log.Level{
			log.PanicLevel,
			log.FatalLevel,
		},
	})
	err := wails.Run(&options.App{
		Title: "Paisa",
		AssetServer: &assetserver.Options{
			Handler: server.Build(&app.db, false).Handler(),
		},
		BackgroundColour: &options.RGBA{R: 250, G: 250, B: 250, A: 1},
		OnStartup:        app.startup,
		Bind: []any{
			app,
		},
		WindowStartState:         options.Maximised,
		EnableDefaultContextMenu: true,
		Logger:                   &logger.Logger{},
		Mac: &mac.Options{
			About: &mac.AboutInfo{
				Title:   "Paisa",
				Message: "Version 0.9.1 \nCopyright © 2022 - 2025 Anantha Kumaran\nCopyright © 2026 Pratap Kute",
				Icon:    icon,
			},
		},

		Linux: &linux.Options{
			Icon:             icon,
			ProgramName:      "Paisa",
			WebviewGpuPolicy: linuxGpuPolicy,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
