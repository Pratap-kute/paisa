package model

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type QueryPlanRow struct {
	ID     int
	Parent int
	NotUse int
	Detail string
}

func explainQueryPlan(t *testing.T, db *gorm.DB, query string, args ...any) []string {
	t.Helper()
	sqlDB, err := db.DB()
	require.NoError(t, err)

	rows, err := sqlDB.Query("EXPLAIN QUERY PLAN "+query, args...)
	require.NoError(t, err)
	defer func() {
		require.NoError(t, rows.Close())
	}()

	var details []string
	for rows.Next() {
		var r QueryPlanRow
		require.NoError(t, rows.Scan(&r.ID, &r.Parent, &r.NotUse, &r.Detail))
		details = append(details, r.Detail)
	}
	return details
}

func TestExplainQueryPlans(t *testing.T) {
	dir := t.TempDir()
	db, err := database.InitializePath(context.Background(), filepath.Join(dir, "explain.db"))
	require.NoError(t, err)

	postings := GenerateSyntheticPostings(1000)
	require.NoError(t, posting.UpsertAll(db, postings))

	t.Run("Query_All", func(t *testing.T) {
		q := "SELECT * FROM postings WHERE forecast = ? ORDER BY date ASC, amount DESC, account ASC"
		plans := explainQueryPlan(t, db, q, false)
		for _, p := range plans {
			t.Logf("PLAN Query_All: %s", p)
		}
	})

	t.Run("Query_AccountPrefix", func(t *testing.T) {
		q := "SELECT * FROM postings WHERE (account LIKE ? OR account = ?) AND forecast = ? ORDER BY date ASC, amount DESC, account ASC"
		plans := explainQueryPlan(t, db, q, "Expenses:Food:%", "Expenses:Food", false)
		for _, p := range plans {
			t.Logf("PLAN Query_AccountPrefix: %s", p)
		}
	})

	t.Run("Query_DateRange", func(t *testing.T) {
		q := "SELECT * FROM postings WHERE date >= ? AND date < ? AND forecast = ? ORDER BY date ASC, amount DESC, account ASC"
		plans := explainQueryPlan(t, db, q, time.Now().AddDate(-1, 0, 0), time.Now(), false)
		for _, p := range plans {
			t.Logf("PLAN Query_DateRange: %s", p)
		}
	})

	t.Run("Query_Price_Commodity", func(t *testing.T) {
		q := "SELECT * FROM prices WHERE commodity_type != ?"
		plans := explainQueryPlan(t, db, q, "unknown")
		for _, p := range plans {
			t.Logf("PLAN Query_Price_Commodity: %s", p)
		}
	})

	t.Run("Query_Cache_HashKey", func(t *testing.T) {
		q := "SELECT * FROM caches WHERE hash_key = ? ORDER BY id LIMIT 1"
		plans := explainQueryPlan(t, db, q, "12345")
		for _, p := range plans {
			t.Logf("PLAN Query_Cache_HashKey: %s", p)
		}
	})
}
