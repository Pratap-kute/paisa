package main

import (
	"context"

	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"

	"github.com/ananthakumaran/paisa/cmd"
	log "github.com/sirupsen/logrus"
)

// App struct
type App struct {
	ctx context.Context
	db  gorm.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	cmd.InitConfig()
	runtime.WindowMaximise(ctx)

	db, err := database.Initialize()
	if err != nil {
		log.Error(err)
		_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:          runtime.ErrorDialog,
			Title:         "Database Initialization Failed",
			Message:       err.Error(),
			DefaultButton: "Close",
		})
		runtime.Quit(ctx)
		return
	}

	a.db = *db
}
