package model

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSyncCommodities_UnknownProviderIsReportedNotPanic(t *testing.T) {
	db, err := database.InitializePath(context.Background(), filepath.Join(t.TempDir(), "paisa.db"))
	require.NoError(t, err)
	commodities := []config.Commodity{{Name: "X", Type: config.Stock, Price: config.Price{Provider: "bogus", Code: "x"}}}

	require.NotPanics(t, func() {
		err = syncCommodities(db, commodities)
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "X")
}
