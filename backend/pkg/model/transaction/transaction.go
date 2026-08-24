package transaction

import (
	"sync"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type Transaction struct {
	ID           string            `json:"id"`
	Date         time.Time         `json:"date"`
	Payee        string            `json:"payee"`
	Postings     []posting.Posting `json:"postings"`
	TagRecurring string            `json:"tag_recurring"`
	TagPeriod    string            `json:"tag_period"`
	BeginLine    uint64            `json:"beginLine"`
	EndLine      uint64            `json:"endLine"`
	FileName     string            `json:"fileName"`
	Note         string            `json:"note"`
}

type transactionCache struct {
	mu           sync.RWMutex
	initialized  bool
	transactions map[string]Transaction
}

var tcache transactionCache

func GetByID(db *gorm.DB, id string) (Transaction, bool) {
	tcache.mu.RLock()
	if tcache.initialized {
		t, found := tcache.transactions[id]
		tcache.mu.RUnlock()
		return t, found
	}
	tcache.mu.RUnlock()

	tcache.mu.Lock()
	defer tcache.mu.Unlock()
	if !tcache.initialized {
		postings := query.Init(db).All()
		txs := make(map[string]Transaction, len(postings))
		built := Build(postings)
		for i := range built {
			txs[built[i].ID] = built[i]
		}
		tcache.transactions = txs
		tcache.initialized = true
	}
	t, found := tcache.transactions[id]
	return t, found
}

func ClearCache() {
	tcache.mu.Lock()
	tcache.transactions = nil
	tcache.initialized = false
	tcache.mu.Unlock()
}

func Build(postings []posting.Posting) []Transaction {
	grouped := lo.GroupBy(postings, func(p posting.Posting) string { return p.TransactionID })
	return lo.Map(lo.Values(grouped), func(ps []posting.Posting, _ int) Transaction {
		sample := ps[0]
		var tagRecurring string
		var tagPeriod string
		for i := range ps {
			p := &ps[i]
			if p.TagRecurring != "" {
				tagRecurring = p.TagRecurring
			}

			if p.TagPeriod != "" {
				tagPeriod = p.TagPeriod
			}
		}
		return Transaction{
			ID:           sample.TransactionID,
			Date:         sample.Date,
			Payee:        sample.Payee,
			Postings:     ps,
			TagRecurring: tagRecurring,
			TagPeriod:    tagPeriod,
			BeginLine:    sample.TransactionBeginLine,
			EndLine:      sample.TransactionEndLine,
			Note:         sample.TransactionNote,
			FileName:     sample.FileName,
		}
	})
}
