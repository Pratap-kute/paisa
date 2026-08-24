package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfig_ConcurrentReadReload(t *testing.T) {
	tempDir := t.TempDir()
	configA := fmt.Sprintf(`
journal_path: %s
db_path: %s
time_zone: Asia/Kolkata
default_currency: INR
`, filepath.Join(tempDir, "main.ledger"), filepath.Join(tempDir, "paisa.db"))

	configB := fmt.Sprintf(`
journal_path: %s
db_path: %s
time_zone: America/New_York
default_currency: USD
`, filepath.Join(tempDir, "alt.ledger"), filepath.Join(tempDir, "alt.db"))

	require.NoError(t, LoadConfig([]byte(configA), filepath.Join(tempDir, "paisa.yaml")))

	var wg sync.WaitGroup
	stop := make(chan struct{})

	// 5 reader goroutines
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-stop:
					return
				default:
					cfg := GetConfig()
					tz := TimeZone()
					curr := DefaultCurrency()
					jp := GetJournalPath()
					dbp := GetDBPath()

					assert.NotEmpty(t, jp)
					assert.NotEmpty(t, dbp)
					assert.NotNil(t, tz)

					// Invariant: each returned snapshot must be internally consistent
					switch cfg.DefaultCurrency {
					case "INR":
						assert.Equal(t, "Asia/Kolkata", cfg.TimeZone)
					case "USD":
						assert.Equal(t, "America/New_York", cfg.TimeZone)
					}

					// TimeZone must always return one of the valid published timezones
					assert.Contains(t, []string{"Asia/Kolkata", "America/New_York"}, tz.String())
					assert.Contains(t, []string{"INR", "USD"}, curr)
				}
			}
		}()
	}

	// 2 writer goroutines toggling between configA and configB
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				var err error
				if (j+id)%2 == 0 {
					err = LoadConfig([]byte(configA), filepath.Join(tempDir, "paisa.yaml"))
				} else {
					err = LoadConfig([]byte(configB), filepath.Join(tempDir, "paisa.yaml"))
				}
				assert.NoError(t, err)
			}
		}(i)
	}

	// Run for a short period
	time.Sleep(100 * time.Millisecond)
	close(stop)
	wg.Wait()
}

func TestConfig_SaveConfigConcurrent(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "paisa.yaml")
	cfgContent := fmt.Sprintf(`
journal_path: %s
db_path: %s
time_zone: UTC
default_currency: EUR
`, filepath.Join(tempDir, "main.ledger"), filepath.Join(tempDir, "paisa.db"))

	require.NoError(t, os.WriteFile(configPath, []byte(cfgContent), 0600))
	require.NoError(t, LoadConfig([]byte(cfgContent), configPath))

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			cfg := GetConfig()
			cfg.DefaultCurrency = fmt.Sprintf("C%d", id%5)
			_ = SaveConfigObject(cfg)
		}(i)
	}
	wg.Wait()
}
