package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "embed"

	log "github.com/sirupsen/logrus"

	"dario.cat/mergo"
	"github.com/ananthakumaran/paisa/pkg/auth"
	"github.com/santhosh-tekuri/jsonschema/v5"

	"gopkg.in/yaml.v3"
)

type TaxCategoryType string

const (
	Debt           TaxCategoryType = "debt"
	Equity         TaxCategoryType = "equity"
	Equity65       TaxCategoryType = "equity65"
	Equity35       TaxCategoryType = "equity35"
	UnlistedEquity TaxCategoryType = "unlisted_equity"
)

type CommodityType string

const (
	MutualFund CommodityType = "mutualfund"
	NPS        CommodityType = "nps"
	Stock      CommodityType = "stock"
	Metal      CommodityType = "metal"
	Unknown    CommodityType = "unknown"
)

type BoolType string

const (
	Yes BoolType = "yes"
	No  BoolType = "no"
)

type ImportTemplate struct {
	Name    string `json:"name" yaml:"name"`
	Content string `json:"content" yaml:"content"`
}

type Price struct {
	Provider string `json:"provider" yaml:"provider"`
	Code     string `json:"code" yaml:"code"`
}

type Commodity struct {
	Name        string          `json:"name" yaml:"name"`
	Type        CommodityType   `json:"type" yaml:"type"`
	Price       Price           `json:"price" yaml:"price"`
	Harvest     int             `json:"harvest" yaml:"harvest"`
	TaxCategory TaxCategoryType `json:"tax_category" yaml:"tax_category"`
}

type Account struct {
	Name string `json:"name" yaml:"name"`
	Icon string `json:"icon" yaml:"icon"`
}

type UserAccount struct {
	Username string `json:"username" yaml:"username"`
	Password string `json:"password" yaml:"password"`
}

type Goals struct {
	Retirement []RetirementGoal `json:"retirement" yaml:"retirement"`
	Savings    []SavingsGoal    `json:"savings" yaml:"savings"`
}

type RetirementGoal struct {
	Name           string   `json:"name" yaml:"name"`
	Icon           string   `json:"icon" yaml:"icon"`
	SWR            float64  `json:"swr" yaml:"swr"`
	Expenses       []string `json:"expenses" yaml:"expenses"`
	Savings        []string `json:"savings" yaml:"savings"`
	YearlyExpenses float64  `json:"yearly_expenses" yaml:"yearly_expenses"`
	Priority       int      `json:"priority" yaml:"priority"`
}

type SavingsGoal struct {
	Name             string   `json:"name" yaml:"name"`
	Icon             string   `json:"icon" yaml:"icon"`
	Target           float64  `json:"target" yaml:"target"`
	TargetDate       string   `json:"target_date" yaml:"target_date"`
	Rate             float64  `json:"rate" yaml:"rate"`
	PaymentPerPeriod float64  `json:"payment_per_period" yaml:"payment_per_period"`
	Accounts         []string `json:"accounts" yaml:"accounts"`
	Priority         int      `json:"priority" yaml:"priority"`
}

type ScheduleAL struct {
	Code     string   `json:"code" yaml:"code"`
	Accounts []string `json:"accounts" yaml:"accounts"`
}

type Budget struct {
	Rollover BoolType `json:"rollover" yaml:"rollover"`
}

type AllocationTarget struct {
	Name     string   `json:"name" yaml:"name"`
	Target   float64  `json:"target" yaml:"target"`
	Accounts []string `json:"accounts" yaml:"accounts"`
}

type CreditCard struct {
	Account         string `json:"account" yaml:"account"`
	CreditLimit     int    `json:"credit_limit" yaml:"credit_limit"`
	StatementEndDay int    `json:"statement_end_day" yaml:"statement_end_day"`
	DueDay          int    `json:"due_day" yaml:"due_day"`
	Network         string `json:"network" yaml:"network"`
	Number          string `json:"number" yaml:"number"`
	ExpirationDate  string `json:"expiration_date" yaml:"expiration_date"`
}

type MerchantRule struct {
	Account   string   `json:"account" yaml:"account"`
	Merchant  string   `json:"merchant,omitempty" yaml:"merchant,omitempty"`
	Merchants []string `json:"merchants,omitempty" yaml:"merchants,omitempty"`
}

func (r MerchantRule) MerchantNames() []string {
	if len(r.Merchants) > 0 {
		res := make([]string, 0, len(r.Merchants))
		for _, m := range r.Merchants {
			trimmed := strings.TrimSpace(m)
			if trimmed != "" {
				res = append(res, trimmed)
			}
		}
		return res
	}
	if trimmed := strings.TrimSpace(r.Merchant); trimmed != "" {
		return []string{trimmed}
	}
	return nil
}

type PredictionConfig struct {
	MerchantRules []MerchantRule `json:"merchant_rules" yaml:"merchant_rules"`
}

type Config struct {
	JournalPath                string       `json:"journal_path" yaml:"journal_path"`
	DBPath                     string       `json:"db_path" yaml:"db_path"`
	SheetsDirectory            string       `json:"sheets_directory" yaml:"sheets_directory"`
	Readonly                   bool         `json:"readonly" yaml:"readonly"`
	LedgerCli                  string       `json:"ledger_cli" yaml:"ledger_cli"`
	DefaultCurrency            string       `json:"default_currency" yaml:"default_currency"`
	DisplayPrecision           int          `json:"display_precision" yaml:"display_precision"`
	AmountAlignmentColumn      int          `json:"amount_alignment_column" yaml:"amount_alignment_column"`
	Locale                     string       `json:"locale" yaml:"locale"`
	TimeZone                   string       `json:"time_zone" yaml:"time_zone"`
	FinancialYearStartingMonth time.Month   `json:"financial_year_starting_month" yaml:"financial_year_starting_month"`
	WeekStartingDay            time.Weekday `json:"week_starting_day" yaml:"week_starting_day"`
	Strict                     BoolType     `json:"strict" yaml:"strict"`

	Budget Budget `json:"budget" yaml:"budget"`

	ScheduleALs []ScheduleAL `json:"schedule_al" yaml:"schedule_al"`

	AllocationTargets []AllocationTarget `json:"allocation_targets" yaml:"allocation_targets"`

	Commodities []Commodity `json:"commodities" yaml:"commodities"`

	ImportTemplates []ImportTemplate `json:"import_templates" yaml:"import_templates"`

	Accounts []Account `json:"accounts" yaml:"accounts"`

	Goals Goals `json:"goals" yaml:"goals"`

	UserAccounts []UserAccount `json:"user_accounts" yaml:"user_accounts"`

	CreditCards []CreditCard `json:"credit_cards" yaml:"credit_cards"`

	Prediction PredictionConfig `json:"prediction" yaml:"prediction"`
}

var (
	configMu      sync.RWMutex
	configWriteMu sync.Mutex
	config        Config
	configPath    string
	location      *time.Location
)

var defaultConfig = Config{
	Readonly:                   false,
	LedgerCli:                  "ledger",
	DefaultCurrency:            "INR",
	DisplayPrecision:           0,
	AmountAlignmentColumn:      52,
	Locale:                     "en-IN",
	TimeZone:                   "",
	Budget:                     Budget{Rollover: Yes},
	FinancialYearStartingMonth: 4,
	Strict:                     No,
	WeekStartingDay:            0,
	ScheduleALs:                []ScheduleAL{},
	AllocationTargets:          []AllocationTarget{},
	Commodities:                []Commodity{},
	ImportTemplates:            []ImportTemplate{},
	Accounts:                   []Account{},
	Goals:                      Goals{Retirement: []RetirementGoal{}, Savings: []SavingsGoal{}},
	UserAccounts:               []UserAccount{},
	CreditCards:                []CreditCard{},
	Prediction:                 PredictionConfig{MerchantRules: []MerchantRule{}},
}

var itemsUniquePropertiesMeta = jsonschema.MustCompileString("itemsUniqueProperties.json", `{
  "properties": {
    "itemsUniqueProperties": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "minItems": 1
    }
  }
}`)

type (
	itemsUniquePropertiesSchema    []string
	itemsUniquePropertiessCompiler struct{}
)

func (itemsUniquePropertiessCompiler) Compile(ctx jsonschema.CompilerContext, m map[string]any) (jsonschema.ExtSchema, error) {
	if items, ok := m["itemsUniqueProperties"]; ok {
		itemsInterface := items.([]any)
		itemsString := make([]string, len(itemsInterface))
		for i, v := range itemsInterface {
			itemsString[i] = v.(string)
		}
		return itemsUniquePropertiesSchema(itemsString), nil
	}

	//nolint:nilnil // jsonschema.ExtCompiler contract requires nil, nil when keyword is not present
	return nil, nil
}

func (s itemsUniquePropertiesSchema) Validate(ctx jsonschema.ValidationContext, v any) error {
	for _, uniqueProperty := range s {
		items := v.([]any)
		seen := make(map[string]bool)
		for _, item := range items {
			itemMap := item.(map[string]any)
			if _, ok := itemMap[uniqueProperty]; ok {
				value := itemMap[uniqueProperty].(string)
				if seen[value] {
					return ctx.Error("itemsUniqueProperty", "duplicate %s %s", uniqueProperty, value)
				}
				seen[value] = true
			}
		}
	}
	return nil
}

//go:embed schema.json
var SchemaJSON string
var schema *jsonschema.Schema

func init() {
	c := jsonschema.NewCompiler()
	c.AssertFormat = true
	c.Draft = jsonschema.Draft2020
	c.RegisterExtension("itemsUniqueProperties", itemsUniquePropertiesMeta, itemsUniquePropertiessCompiler{})
	err := c.AddResource("schema.json", strings.NewReader(SchemaJSON))
	if err != nil {
		log.Fatal(err)
	}

	schema = c.MustCompile("schema.json")
}

func MutateConfig(fn func(cfg *Config) error) error {
	configWriteMu.Lock()
	defer configWriteMu.Unlock()

	currentConfig := GetConfig()
	if err := fn(&currentConfig); err != nil {
		return err
	}
	content, err := yaml.Marshal(currentConfig)
	if err != nil {
		return err
	}
	return saveConfigLocked(content)
}

func SaveConfigObject(config Config) error {
	content, err := yaml.Marshal(config)
	if err != nil {
		return err
	}
	return SaveConfig(content)
}

func atomicWriteFile(filename string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(filename)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}

	tmpFile, err := os.CreateTemp(dir, ".paisa-tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmpFile.Name()
	cleanedUp := false
	defer func() {
		if !cleanedUp {
			_ = tmpFile.Close()
			_ = os.Remove(tmpName)
		}
	}()

	if _, err := tmpFile.Write(data); err != nil {
		return err
	}

	if err := tmpFile.Chmod(perm); err != nil {
		return err
	}

	if err := tmpFile.Sync(); err != nil {
		return err
	}

	if err := tmpFile.Close(); err != nil {
		return err
	}

	if err := os.Rename(tmpName, filename); err != nil {
		return err
	}

	cleanedUp = true
	return nil
}

func SaveConfig(content []byte) error {
	configWriteMu.Lock()
	defer configWriteMu.Unlock()
	return saveConfigLocked(content)
}

func saveConfigLocked(content []byte) error {
	var configJSON any
	err := yaml.Unmarshal(content, &configJSON)
	if err != nil {
		return err
	}

	err = schema.Validate(configJSON)
	if err != nil {
		return fmt.Errorf("invalid configuration\n%w", err)
	}

	newConfig := Config{}
	err = yaml.Unmarshal(content, &newConfig)
	if err != nil {
		return err
	}

	err = mergo.Merge(&newConfig, defaultConfig, mergo.WithOverrideEmptySlice)
	if err != nil {
		return err
	}

	var newLocation *time.Location
	if newConfig.TimeZone == "" {
		newLocation = time.Local
	} else {
		newLocation, err = time.LoadLocation(newConfig.TimeZone)
		if err != nil {
			return fmt.Errorf("invalid time zone: %s\n%w", newConfig.TimeZone, err)
		}
	}

	configMu.RLock()
	existingAccounts := make(map[string]string)
	for _, acc := range config.UserAccounts {
		existingAccounts[acc.Username] = acc.Password
	}
	cp := configPath
	configMu.RUnlock()

	for i := range newConfig.UserAccounts {
		acc := &newConfig.UserAccounts[i]
		switch {
		case acc.Password == "":
			if existingPw, ok := existingAccounts[acc.Username]; ok {
				acc.Password = existingPw
			}
		case strings.HasPrefix(acc.Password, "sha256:") || strings.HasPrefix(acc.Password, "$argon2id$"):
			// Already a valid verifier format, keep as is
		default:
			hashed, hashErr := auth.HashPassword(acc.Password)
			if hashErr != nil {
				return hashErr
			}
			acc.Password = hashed
		}
	}

	yamlContent, err := yaml.Marshal(newConfig)
	if err != nil {
		return err
	}

	err = atomicWriteFile(cp, yamlContent, 0o600)
	if err != nil {
		return err
	}

	configMu.Lock()
	config = newConfig
	location = newLocation
	configMu.Unlock()

	return nil
}

func GetPublicConfig() Config {
	configMu.RLock()
	defer configMu.RUnlock()
	publicCfg := config
	if len(publicCfg.UserAccounts) > 0 {
		publicCfg.UserAccounts = make([]UserAccount, len(config.UserAccounts))
		for i, acc := range config.UserAccounts {
			publicCfg.UserAccounts[i] = UserAccount{
				Username: acc.Username,
				Password: "", // Redact verifier
			}
		}
	}
	return publicCfg
}

func UpgradeUserPassword(username string, passwordToken string) error {
	configMu.Lock()
	defer configMu.Unlock()

	accountIdx := -1
	for i, acc := range config.UserAccounts {
		if acc.Username == username {
			accountIdx = i
			break
		}
	}
	if accountIdx == -1 {
		return fmt.Errorf("user %s not found in configuration", username)
	}

	newHash, err := auth.HashPassword(passwordToken)
	if err != nil {
		return err
	}

	newConfig := config
	newAccounts := make([]UserAccount, len(config.UserAccounts))
	copy(newAccounts, config.UserAccounts)
	newAccounts[accountIdx].Password = newHash
	newConfig.UserAccounts = newAccounts

	yamlContent, err := yaml.Marshal(newConfig)
	if err != nil {
		return err
	}

	if err := atomicWriteFile(configPath, yamlContent, 0o600); err != nil {
		log.Warnf("Failed to persist upgraded credential for %s: %v", username, err)
		return err
	}

	config = newConfig
	log.Infof("Successfully upgraded credential to Argon2id for user %s", username)
	return nil
}

func LoadConfigFile(path string) {
	path, err := filepath.Abs(path)
	if err != nil {
		log.Fatal(err)
	}

	//nolint:gosec // loading config from user-specified path
	content, err := os.ReadFile(path)
	if err != nil {
		log.Warn("Failed to read config file: ", path)
		log.Fatal(err)
	}

	err = LoadConfig(content, path)
	if err != nil {
		log.Fatal(err)
	}

	log.Info("Using config file: ", path)
}

func LoadConfig(content []byte, cp string) error {
	var configJSON any
	err := yaml.Unmarshal(content, &configJSON)
	if err != nil {
		return err
	}

	err = schema.Validate(configJSON)
	if err != nil {
		return fmt.Errorf("invalid configuration\n%w", err)
	}

	newConfig := Config{}
	err = yaml.Unmarshal(content, &newConfig)
	if err != nil {
		return err
	}

	err = mergo.Merge(&newConfig, defaultConfig, mergo.WithOverrideEmptySlice)
	if err != nil {
		return err
	}

	var newLocation *time.Location
	if newConfig.TimeZone == "" {
		newLocation = time.Local
	} else {
		newLocation, err = time.LoadLocation(newConfig.TimeZone)
		if err != nil {
			return fmt.Errorf("invalid time zone: %s\n%w", newConfig.TimeZone, err)
		}
	}

	configMu.Lock()
	config = newConfig
	if cp != "" {
		configPath = cp
	}
	location = newLocation
	configMu.Unlock()

	return nil
}

func GetConfig() Config {
	configMu.RLock()
	defer configMu.RUnlock()
	return config
}

func GetJournalPath() string {
	configMu.RLock()
	defer configMu.RUnlock()
	if !filepath.IsAbs(config.JournalPath) {
		return filepath.Join(filepath.Dir(configPath), config.JournalPath)
	}

	return config.JournalPath
}

func GetSheetDir() string {
	configMu.RLock()
	sheetsDir := config.SheetsDirectory
	journalPath := config.JournalPath
	cfgDir := filepath.Dir(configPath)
	configMu.RUnlock()

	if sheetsDir == "" {
		if !filepath.IsAbs(journalPath) {
			return filepath.Dir(filepath.Join(cfgDir, journalPath))
		}
		return filepath.Dir(journalPath)
	}

	dir := sheetsDir
	if !filepath.IsAbs(sheetsDir) {
		dir = filepath.Join(cfgDir, sheetsDir)
	}

	err := os.MkdirAll(dir, 0o750)
	if err != nil {
		log.Fatal("Failed to create sheets directory", err)
	}

	return dir
}

func GetDBPath() string {
	configMu.RLock()
	defer configMu.RUnlock()
	if !filepath.IsAbs(config.DBPath) {
		return filepath.Join(filepath.Dir(configPath), config.DBPath)
	}

	return config.DBPath
}

func GetConfigDir() string {
	configMu.RLock()
	defer configMu.RUnlock()
	return filepath.Dir(configPath)
}

func GetConfigPath() string {
	configMu.RLock()
	defer configMu.RUnlock()
	return configPath
}

func GetSchema() any {
	var schemaObject any
	err := json.Unmarshal([]byte(SchemaJSON), &schemaObject)
	if err != nil {
		log.Fatal(err)
	}
	return schemaObject
}

func EnsureLogFilePath() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}

	path := filepath.Join(cacheDir, "paisa", "paisa.log")

	err = os.MkdirAll(filepath.Dir(path), 0o750)
	if err != nil {
		return "", err
	}

	//nolint:gosec // opening log file in user cache directory
	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600)
	if err != nil {
		return "", err
	}

	err = file.Close()
	if err != nil {
		return "", err
	}

	return path, err
}

func DefaultCurrency() string {
	configMu.RLock()
	defer configMu.RUnlock()
	return config.DefaultCurrency
}

func TimeZone() *time.Location {
	configMu.RLock()
	defer configMu.RUnlock()
	if location != nil {
		return location
	}

	return time.Local
}

func UpsertMerchantRule(merchant, account, prefix string) (*MerchantRule, error) {
	normMerchant := strings.TrimSpace(merchant)
	if normMerchant == "" {
		return nil, fmt.Errorf("merchant cannot be empty")
	}

	normAccount := strings.TrimSpace(account)
	if normAccount == "" {
		return nil, fmt.Errorf("account cannot be empty")
	}

	normPrefix := strings.TrimSpace(prefix)
	if normPrefix != "" {
		cleanPrefix := strings.TrimSuffix(normPrefix, ":")
		if !strings.HasPrefix(strings.ToLower(normAccount), strings.ToLower(cleanPrefix)+":") && !strings.EqualFold(normAccount, cleanPrefix) {
			normAccount = cleanPrefix + ":" + strings.TrimPrefix(normAccount, ":")
		}
	}

	var res MerchantRule
	err := MutateConfig(func(cfg *Config) error {
		rules := make([]MerchantRule, 0, len(cfg.Prediction.MerchantRules))
		var targetIndex = -1

		for _, rule := range cfg.Prediction.MerchantRules {
			allMerchants := rule.MerchantNames()
			if strings.EqualFold(rule.Account, normAccount) {
				if targetIndex == -1 {
					rule.Account = normAccount
					rule.Merchant = ""
					rule.Merchants = allMerchants
					rules = append(rules, rule)
					targetIndex = len(rules) - 1
				} else {
					for _, m := range allMerchants {
						exists := false
						for _, em := range rules[targetIndex].Merchants {
							if strings.EqualFold(em, m) {
								exists = true
								break
							}
						}
						if !exists {
							rules[targetIndex].Merchants = append(rules[targetIndex].Merchants, m)
						}
					}
				}
			} else {
				filtered := make([]string, 0, len(allMerchants))
				for _, m := range allMerchants {
					if !strings.EqualFold(m, normMerchant) {
						filtered = append(filtered, m)
					}
				}
				if len(filtered) > 0 {
					rules = append(rules, MerchantRule{
						Account:   rule.Account,
						Merchants: filtered,
					})
				}
			}
		}

		if targetIndex == -1 {
			newRule := MerchantRule{
				Account:   normAccount,
				Merchants: []string{normMerchant},
			}
			rules = append(rules, newRule)
			targetIndex = len(rules) - 1
		} else {
			exists := false
			for _, m := range rules[targetIndex].Merchants {
				if strings.EqualFold(m, normMerchant) {
					exists = true
					break
				}
			}
			if !exists {
				rules[targetIndex].Merchants = append(rules[targetIndex].Merchants, normMerchant)
			}
		}

		cfg.Prediction.MerchantRules = rules
		res = rules[targetIndex]
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &res, nil
}
