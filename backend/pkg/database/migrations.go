package database

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

type migration struct {
	Version    int
	Name       string
	Statements []string
}

func (m migration) Checksum() string {
	payload := fmt.Sprintf("%d\n%s\n%s", m.Version, m.Name, strings.Join(m.Statements, "\n"))
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}

var migrations = []migration{
	{
		Version: 1,
		Name:    "baseline_pre_migrations",
		Statements: []string{
			"CREATE TABLE `nps_schemes` (`id` integer PRIMARY KEY AUTOINCREMENT,`pfm_name` text,`scheme_id` text,`scheme_name` text)",
			"CREATE TABLE `schemes` (`id` integer PRIMARY KEY AUTOINCREMENT,`amc` text,`code` text,`name` text,`type` text,`category` text,`nav_name` text)",
			"CREATE TABLE `postings` (`id` integer PRIMARY KEY AUTOINCREMENT,`transaction_id` text,`date` datetime,`payee` text,`account` text,`commodity` text,`quantity` text,`amount` text,`status` text,`tag_recurring` text,`tag_period` text,`transaction_begin_line` integer,`transaction_end_line` integer,`file_name` text,`forecast` numeric,`note` text,`transaction_note` text)",
			"CREATE TABLE `prices` (`id` integer PRIMARY KEY AUTOINCREMENT,`date` datetime,`commodity_type` text,`commodity_id` text,`commodity_name` text,`value` text)",
			"CREATE TABLE `portfolios` (`id` integer PRIMARY KEY AUTOINCREMENT,`commodity_type` text,`parent_commodity_id` text,`security_id` text,`security_name` text,`security_type` text,`security_rating` text,`security_industry` text,`percentage` text)",
			"CREATE TABLE `ciis` (`id` integer PRIMARY KEY AUTOINCREMENT,`financial_year` text,`cost_inflation_index` integer)",
			"CREATE TABLE `caches` (`id` integer PRIMARY KEY AUTOINCREMENT,`expires_at` datetime,`hash_key` text,`value` BLOB)",
		},
	},
	{
		Version: 2,
		Name:    "v0_9_1_indexes",
		Statements: []string{
			"CREATE INDEX IF NOT EXISTS `idx_postings_transaction_id` ON `postings` (`transaction_id`)",
			"CREATE INDEX IF NOT EXISTS `idx_postings_forecast_date` ON `postings` (`forecast`,`date`)",
			"CREATE INDEX IF NOT EXISTS `idx_postings_account_forecast` ON `postings` (`account`,`forecast`)",
			"CREATE INDEX IF NOT EXISTS `idx_postings_commodity` ON `postings` (`commodity`)",
			"CREATE INDEX IF NOT EXISTS `idx_prices_date` ON `prices` (`date`)",
			"CREATE INDEX IF NOT EXISTS `idx_prices_type_name_id` ON `prices` (`commodity_type`,`commodity_name`,`commodity_id`)",
			"CREATE INDEX IF NOT EXISTS `idx_caches_hash_key` ON `caches` (`hash_key`)",
		},
	},
}

var baselineColumns = map[string][]string{
	"nps_schemes": {"id", "pfm_name", "scheme_id", "scheme_name"},
	"schemes":     {"id", "amc", "code", "name", "type", "category", "nav_name"},
	"postings": {
		"id", "transaction_id", "date", "payee", "account", "commodity", "quantity", "amount",
		"status", "tag_recurring", "tag_period", "transaction_begin_line", "transaction_end_line",
		"file_name", "forecast", "note", "transaction_note",
	},
	"prices":     {"id", "date", "commodity_type", "commodity_id", "commodity_name", "value"},
	"portfolios": {"id", "commodity_type", "parent_commodity_id", "security_id", "security_name", "security_type", "security_rating", "security_industry", "percentage"},
	"ciis":       {"id", "financial_year", "cost_inflation_index"},
	"caches":     {"id", "expires_at", "hash_key", "value"},
}
