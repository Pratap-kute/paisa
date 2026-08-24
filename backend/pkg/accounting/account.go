package accounting

import (
	"slices"
	"sync"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"gorm.io/gorm"
)

type accountCache struct {
	mu          sync.RWMutex
	initialized bool
	accounts    []string
}

var acache accountCache

func AllAccounts(db *gorm.DB) []string {
	acache.mu.RLock()
	if acache.initialized {
		res := slices.Clone(acache.accounts)
		acache.mu.RUnlock()
		return res
	}
	acache.mu.RUnlock()

	acache.mu.Lock()
	defer acache.mu.Unlock()
	if !acache.initialized {
		var accounts []string
		db.Model(&posting.Posting{}).Distinct().Pluck("Account", &accounts)
		acache.accounts = accounts
		acache.initialized = true
	}
	return slices.Clone(acache.accounts)
}

func IsLeafAccount(db *gorm.DB, account string) bool {
	return slices.Contains(AllAccounts(db), account)
}

func ClearCache() {
	acache.mu.Lock()
	acache.accounts = nil
	acache.initialized = false
	acache.mu.Unlock()
}
