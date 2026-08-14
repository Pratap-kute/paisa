package query

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/internal/config"
	"github.com/ananthakumaran/paisa/internal/model/posting"
	"github.com/ananthakumaran/paisa/internal/utils"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func queryTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}))
	sqlDB, err := db.DB()
	require.NoError(t, err)
	t.Cleanup(func() { _ = sqlDB.Close() })
	return db
}

func seedQueryPostings(t *testing.T, db *gorm.DB) []posting.Posting {
	t.Helper()
	date := func(month time.Month, day int) time.Time { return time.Date(2024, month, day, 0, 0, 0, 0, time.Local) }
	posts := []posting.Posting{
		{TransactionID: "cash", Date: date(time.January, 5), Account: "Assets:Checking:Bank", Commodity: "INR", Amount: decimal.NewFromInt(100), Status: "cleared"},
		{TransactionID: "food", Date: date(time.January, 10), Account: "Expenses:Food", Commodity: "INR", Amount: decimal.NewFromInt(-20), Status: "pending"},
		{TransactionID: "stock", Date: date(time.February, 1), Account: "Assets:Broker:AAPL", Commodity: "AAPL", Amount: decimal.NewFromInt(50), Status: "cleared"},
		{TransactionID: "income", Date: date(time.February, 5), Account: "Income:Salary", Commodity: "INR", Amount: decimal.NewFromInt(-200), Status: "cleared"},
		{TransactionID: "forecast", Date: date(time.February, 20), Account: "Expenses:Rent", Commodity: "INR", Amount: decimal.NewFromInt(30), Status: "pending", Forecast: true},
	}
	require.NoError(t, db.Create(&posts).Error)
	return posts
}

func ids(posts []posting.Posting) []string {
	result := make([]string, len(posts))
	for i := range posts {
		result[i] = posts[i].TransactionID
	}
	return result
}

func TestQueryFilters(t *testing.T) {
	tests := []struct {
		name  string
		build func(*gorm.DB) *Query
		want  []string
	}{
		{name: "default excludes forecast", build: func(db *gorm.DB) *Query { return Init(db) }, want: []string{"cash", "food", "stock", "income"}},
		{name: "forecast selects forecast rows", build: func(db *gorm.DB) *Query { return Init(db).Forecast() }, want: []string{"forecast"}},
		{name: "credit", build: func(db *gorm.DB) *Query { return Init(db).Credit() }, want: []string{"cash", "stock"}},
		{name: "account prefix includes exact and descendants", build: func(db *gorm.DB) *Query { return Init(db).AccountPrefix("Assets") }, want: []string{"cash", "stock"}},
		{name: "multiple account prefixes", build: func(db *gorm.DB) *Query { return Init(db).AccountPrefix("Assets:Checking", "Income") }, want: []string{"cash", "income"}},
		{name: "not account prefix", build: func(db *gorm.DB) *Query { return Init(db).NotAccountPrefix("Assets") }, want: []string{"food", "income"}},
		{name: "like wildcard", build: func(db *gorm.DB) *Query { return Init(db).Like("Assets:%") }, want: []string{"cash", "stock"}},
		{name: "not like wildcard", build: func(db *gorm.DB) *Query { return Init(db).NotLike("%:Food") }, want: []string{"cash", "stock", "income"}},
		{name: "valid status", build: func(db *gorm.DB) *Query { return Init(db).Status("pending") }, want: []string{"food"}},
		{name: "invalid status ignored", build: func(db *gorm.DB) *Query { return Init(db).Status("unknown") }, want: []string{"cash", "food", "stock", "income"}},
		{name: "commodity", build: func(db *gorm.DB) *Query { return Init(db).Commodities([]config.Commodity{{Name: "AAPL"}}) }, want: []string{"stock"}},
		{name: "descending with limit", build: func(db *gorm.DB) *Query { return Init(db).Desc().Limit(2) }, want: []string{"income", "stock"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := queryTestDB(t)
			seedQueryPostings(t, db)
			assert.Equal(t, tt.want, ids(tt.build(db).All()))
		})
	}
}

func TestQueryDateWindows(t *testing.T) {
	utils.SetNow("2024-02-15")
	tests := []struct {
		name  string
		build func(*gorm.DB) *Query
		want  []string
	}{
		{name: "last two months", build: func(db *gorm.DB) *Query { return Init(db).LastNMonths(2) }, want: []string{"cash", "food", "stock", "income"}},
		{name: "before two month window", build: func(db *gorm.DB) *Query { return Init(db).BeforeNMonths(2) }, want: []string{}},
		{name: "until today", build: func(db *gorm.DB) *Query { return Init(db).UntilToday() }, want: []string{"cash", "food", "stock", "income"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := queryTestDB(t)
			seedQueryPostings(t, db)
			assert.Equal(t, tt.want, ids(tt.build(db).All()))
		})
	}
}

func TestQueryFirstAndClone(t *testing.T) {
	db := queryTestDB(t)
	seedQueryPostings(t, db)

	t.Run("first returns earliest", func(t *testing.T) {
		got := Init(db).First()
		require.NotNil(t, got)
		assert.Equal(t, "cash", got.TransactionID)
	})
	t.Run("first returns nil when empty", func(t *testing.T) {
		assert.Nil(t, Init(db).Where("account = ?", "Missing").First())
	})
	t.Run("clone can add independent filter", func(t *testing.T) {
		base := Init(db).AccountPrefix("Assets")
		clone := base.Clone().Where("commodity = ?", "AAPL")
		assert.Equal(t, []string{"cash", "stock"}, ids(base.All()))
		assert.Equal(t, []string{"stock"}, ids(clone.All()))
	})
}
