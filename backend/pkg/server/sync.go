package server

import (
	"github.com/ananthakumaran/paisa/pkg/cache"
	"github.com/ananthakumaran/paisa/pkg/model"
	"gorm.io/gorm"
)

type SyncRequest struct {
	Journal    bool `json:"journal"`
	Prices     bool `json:"prices"`
	Portfolios bool `json:"portfolios"`
}

type SyncResult struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

func Sync(db *gorm.DB, request SyncRequest) SyncResult {
	if request.Journal {
		message, err := model.SyncJournal(db)
		if err != nil {
			return SyncResult{Success: false, Message: message}
		}
	}

	if request.Prices {
		err := model.SyncCommodities(db)
		if err != nil {
			return SyncResult{Success: false, Message: err.Error()}
		}
		err = model.SyncCII(db)
		if err != nil {
			return SyncResult{Success: false, Message: err.Error()}
		}
	}

	if request.Portfolios {
		err := model.SyncPortfolios(db)
		if err != nil {
			return SyncResult{Success: false, Message: err.Error()}
		}
	}

	cache.Clear()

	return SyncResult{Success: true}
}
