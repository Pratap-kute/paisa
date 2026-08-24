package service

import (
	"sync"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestService_ConcurrentPriceAndInterestCache(t *testing.T) {
	db := serviceTestDB(t)
	d1 := serviceDate(1)

	require.NoError(t, db.Create(&price.Price{
		CommodityName: "NIFTY",
		CommodityType: config.MutualFund,
		Date:          d1,
		Value:         decimal.NewFromInt(100),
	}).Error)

	p1 := posting.Posting{
		TransactionID: "tx1",
		Account:       "Income:Interest:Bank",
		Payee:         "Acme Bank",
		Amount:        decimal.NewFromInt(-500),
		Commodity:     "INR",
		Date:          d1,
	}
	p2 := posting.Posting{
		TransactionID: "tx1",
		Account:       "Assets:Checking",
		Payee:         "Acme Bank",
		Amount:        decimal.NewFromInt(500),
		Commodity:     "INR",
		Date:          d1,
	}
	require.NoError(t, db.Create(&p1).Error)
	require.NoError(t, db.Create(&p2).Error)

	ClearPriceCache()
	ClearInterestCache()

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// Price Readers
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					pr := GetUnitPrice(db, "NIFTY", d1)
					assert.False(t, pr.Value.IsZero())
				}
			}
		}()
	}

	// Interest Readers
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			p := posting.Posting{
				Account:   "Assets:Checking",
				Payee:     "Acme Bank",
				Amount:    decimal.NewFromInt(500),
				Commodity: "INR",
				Date:      d1,
			}
			for {
				select {
				case <-stop:
					return
				default:
					isI := IsInterest(db, p)
					assert.True(t, isI)
				}
			}
		}()
	}

	// Resetters
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				ClearPriceCache()
				ClearInterestCache()
				time.Sleep(1 * time.Millisecond)
			}
		}()
	}

	time.Sleep(100 * time.Millisecond)
	close(stop)
	wg.Wait()
}
