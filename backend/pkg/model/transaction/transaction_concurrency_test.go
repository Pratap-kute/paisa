package transaction

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}))

	p1 := posting.Posting{
		TransactionID: "tx1",
		Account:       "Assets:Checking",
		Amount:        decimal.NewFromInt(100),
		Commodity:     "INR",
		Date:          time.Now(),
	}
	p2 := posting.Posting{
		TransactionID: "tx2",
		Account:       "Expenses:Food",
		Amount:        decimal.NewFromInt(50),
		Commodity:     "INR",
		Date:          time.Now(),
	}
	require.NoError(t, db.Create(&p1).Error)
	require.NoError(t, db.Create(&p2).Error)
	return db
}

func TestTransactionCache_ConcurrentReadClear(t *testing.T) {
	db := setupTestDB(t)
	ClearCache()

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// Readers
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func(readerID int) {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					targetID := "tx1"
					if readerID%2 == 1 {
						targetID = "tx2"
					}
					tx, found := GetByID(db, targetID)
					if found {
						assert.Equal(t, targetID, tx.ID)
						assert.NotEmpty(t, tx.Postings)
					}
				}
			}
		}(i)
	}

	// Resetter
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				ClearCache()
				time.Sleep(1 * time.Millisecond)
			}
		}()
	}

	time.Sleep(100 * time.Millisecond)
	close(stop)
	wg.Wait()
}
