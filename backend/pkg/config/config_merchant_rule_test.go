package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestConfig(t *testing.T, initialYAML string) string {
	t.Helper()
	tempDir := t.TempDir()
	cfgPath := filepath.Join(tempDir, "paisa.yaml")
	if initialYAML == "" {
		initialYAML = `
journal_path: main.ledger
db_path: paisa.db
`
	}
	require.NoError(t, os.WriteFile(cfgPath, []byte(initialYAML), 0o600))
	require.NoError(t, LoadConfig([]byte(initialYAML), cfgPath))
	return cfgPath
}

func TestUpsertMerchantRule_Validation(t *testing.T) {
	setupTestConfig(t, "")

	_, err := UpsertMerchantRule("", "Expenses:Food", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "merchant cannot be empty")

	_, err = UpsertMerchantRule("   ", "Expenses:Food", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "merchant cannot be empty")

	_, err = UpsertMerchantRule("Swiggy", "", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "account cannot be empty")

	_, err = UpsertMerchantRule("Swiggy", "   ", "")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "account cannot be empty")
}

func TestUpsertMerchantRule_NewAndGroupedRules(t *testing.T) {
	setupTestConfig(t, "")

	// 1. Add first merchant to an account
	rule1, err := UpsertMerchantRule("blinkit", "Expenses:Groceries", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Groceries", rule1.Account)
	assert.Equal(t, []string{"blinkit"}, rule1.Merchants)
	assert.Empty(t, rule1.Merchant)

	// Verify in config
	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, "Expenses:Groceries", cfg.Prediction.MerchantRules[0].Account)
	assert.Equal(t, []string{"blinkit"}, cfg.Prediction.MerchantRules[0].Merchants)

	// 2. Add second merchant to the same account (grouped)
	rule2, err := UpsertMerchantRule("zepto", "Expenses:Groceries", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Groceries", rule2.Account)
	assert.Equal(t, []string{"blinkit", "zepto"}, rule2.Merchants)

	cfg = GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, []string{"blinkit", "zepto"}, cfg.Prediction.MerchantRules[0].Merchants)

	// 3. Add merchant to a different account
	rule3, err := UpsertMerchantRule("uber", "Expenses:Travel", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Travel", rule3.Account)
	assert.Equal(t, []string{"uber"}, rule3.Merchants)

	cfg = GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 2)
}

func TestUpsertMerchantRule_Idempotency(t *testing.T) {
	setupTestConfig(t, "")

	_, err := UpsertMerchantRule("blinkit", "Expenses:Groceries", "")
	require.NoError(t, err)

	// Upsert again with exact same merchant and account
	rule, err := UpsertMerchantRule("blinkit", "Expenses:Groceries", "")
	require.NoError(t, err)
	assert.Equal(t, []string{"blinkit"}, rule.Merchants)

	// Upsert again with case difference
	rule, err = UpsertMerchantRule("BLINKIT", "Expenses:Groceries", "")
	require.NoError(t, err)
	assert.Equal(t, []string{"blinkit"}, rule.Merchants)

	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, []string{"blinkit"}, cfg.Prediction.MerchantRules[0].Merchants)
}

func TestUpsertMerchantRule_MoveMerchant(t *testing.T) {
	setupTestConfig(t, "")

	// Set up two accounts with merchants
	_, err := UpsertMerchantRule("blinkit", "Expenses:Groceries", "")
	require.NoError(t, err)
	_, err = UpsertMerchantRule("instamart", "Expenses:Groceries", "")
	require.NoError(t, err)
	_, err = UpsertMerchantRule("uber", "Expenses:Travel", "")
	require.NoError(t, err)

	// Move "blinkit" from Groceries to Shopping
	rule, err := UpsertMerchantRule("blinkit", "Expenses:Shopping", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Shopping", rule.Account)
	assert.Equal(t, []string{"blinkit"}, rule.Merchants)

	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 3)

	// Groceries should now only have instamart
	for _, r := range cfg.Prediction.MerchantRules {
		if r.Account == "Expenses:Groceries" {
			assert.Equal(t, []string{"instamart"}, r.Merchants)
		}
	}

	// Move "uber" from Travel to Transport (Travel only had "uber", so Travel rule should be removed)
	_, err = UpsertMerchantRule("uber", "Expenses:Transport", "")
	require.NoError(t, err)

	cfg = GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 3) // Groceries, Shopping, Transport (Travel removed)
	for _, r := range cfg.Prediction.MerchantRules {
		assert.NotEqual(t, "Expenses:Travel", r.Account)
	}
}

func TestUpsertMerchantRule_PrefixHandling(t *testing.T) {
	setupTestConfig(t, "")

	// 1. Prefix without trailing colon, account without prefix
	rule1, err := UpsertMerchantRule("swiggy", "Food", "Expenses")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Food", rule1.Account)

	// 2. Prefix with trailing colon, account with prefix
	rule2, err := UpsertMerchantRule("zomato", "Expenses:Food", "Expenses:")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Food", rule2.Account)

	// 3. Empty prefix preserves account as is
	rule3, err := UpsertMerchantRule("transfer", "Assets:Bank:Checking", "")
	require.NoError(t, err)
	assert.Equal(t, "Assets:Bank:Checking", rule3.Account)
}

func TestUpsertMerchantRule_LegacyConversion(t *testing.T) {
	initialYAML := `
journal_path: main.ledger
db_path: paisa.db
prediction:
  merchant_rules:
    - merchant: "blinkit"
      account: "Expenses:Groceries"
`
	setupTestConfig(t, initialYAML)

	// Verify initial config has legacy singular merchant
	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, "blinkit", cfg.Prediction.MerchantRules[0].Merchant)
	assert.Empty(t, cfg.Prediction.MerchantRules[0].Merchants)

	// Upsert another merchant to the same account
	rule, err := UpsertMerchantRule("zepto", "Expenses:Groceries", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Groceries", rule.Account)
	assert.Equal(t, []string{"blinkit", "zepto"}, rule.Merchants)
	assert.Empty(t, rule.Merchant)

	// Verify config file passes schema validation and has grouped merchants
	cfg = GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, []string{"blinkit", "zepto"}, cfg.Prediction.MerchantRules[0].Merchants)
	assert.Empty(t, cfg.Prediction.MerchantRules[0].Merchant)
}

func TestUpsertMerchantRule_Concurrency(t *testing.T) {
	setupTestConfig(t, "")

	var wg sync.WaitGroup
	merchants := []string{"m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"}

	for _, m := range merchants {
		wg.Add(1)
		go func(merchantName string) {
			defer wg.Done()
			_, _ = UpsertMerchantRule(merchantName, "Expenses:Shared", "")
		}(m)
	}

	wg.Wait()

	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, "Expenses:Shared", cfg.Prediction.MerchantRules[0].Account)
	assert.Len(t, cfg.Prediction.MerchantRules[0].Merchants, len(merchants))
}

func TestUpsertMerchantRule_ConfigWriteMuSerialization(t *testing.T) {
	setupTestConfig(t, "")

	var wg sync.WaitGroup
	// Run concurrent SaveConfigObject and UpsertMerchantRule
	for i := 0; i < 5; i++ {
		wg.Add(2)
		go func(idx int) {
			defer wg.Done()
			_, _ = UpsertMerchantRule(fmt.Sprintf("merchant_%d", idx), "Expenses:Concurrent", "")
		}(i)
		go func(idx int) {
			defer wg.Done()
			_ = MutateConfig(func(cfg *Config) error {
				cfg.DefaultCurrency = "INR"
				return nil
			})
		}(i)
	}

	wg.Wait()
	cfg := GetConfig()
	assert.Equal(t, "INR", cfg.DefaultCurrency)
	require.NotEmpty(t, cfg.Prediction.MerchantRules)
}

func TestUpsertMerchantRule_WhitespaceAndCaseMatching(t *testing.T) {
	initialYAML := `
journal_path: main.ledger
db_path: paisa.db
prediction:
  merchant_rules:
    - merchant: "  STARBUCKS COFFEE  "
      account: "Expenses:Dining"
`
	setupTestConfig(t, initialYAML)

	// Canonical merchantKey from frontend is usually clean "starbucks coffee"
	// Upserting to a different account should trim and match case-insensitively
	rule, err := UpsertMerchantRule("  starbucks coffee  ", "Expenses:Coffee", "")
	require.NoError(t, err)
	assert.Equal(t, "Expenses:Coffee", rule.Account)
	assert.Equal(t, []string{"starbucks coffee"}, rule.Merchants)

	// Verify the old Dining rule had the merchant removed and was pruned
	cfg := GetConfig()
	require.Len(t, cfg.Prediction.MerchantRules, 1)
	assert.Equal(t, "Expenses:Coffee", cfg.Prediction.MerchantRules[0].Account)
	assert.Equal(t, []string{"starbucks coffee"}, cfg.Prediction.MerchantRules[0].Merchants)
}
