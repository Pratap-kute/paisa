package prediction

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

func setupPredictionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}))

	d1 := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	require.NoError(t, db.Create(&posting.Posting{
		TransactionID: "tx1",
		Account:       "Expenses:Food",
		Payee:         "Dominos Pizza",
		Amount:        decimal.NewFromInt(500),
		Commodity:     "INR",
		Date:          d1,
	}).Error)
	return db
}

func TestPredictionCache_ConcurrentReadClear(t *testing.T) {
	db := setupPredictionTestDB(t)
	ClearCache()

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// Readers
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					res := GetTfIdf(db)
					assert.NotNil(t, res["tf_idf"])
					assert.NotNil(t, res["index"])
				}
			}
		}()
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
