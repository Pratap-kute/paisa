package service

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/database"
	"github.com/ananthakumaran/paisa/pkg/model"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/stretchr/testify/require"
)

func BenchmarkMarket_GetTrees_10k(b *testing.B) {
	dir := b.TempDir()
	db, err := database.InitializePath(context.Background(), filepath.Join(dir, "bench.db"))
	require.NoError(b, err)

	postings := model.GenerateSyntheticPostings(10000)
	require.NoError(b, posting.UpsertAll(db, postings))
	prices := model.GenerateSyntheticPrices(500)
	require.NoError(b, price.UpsertAllByType(db, "unknown", prices))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		c := &priceCache{}
		_, _ = c.getTrees(db, "GOLD")
	}
}

func BenchmarkMarket_GetTrees_50k(b *testing.B) {
	dir := b.TempDir()
	db, err := database.InitializePath(context.Background(), filepath.Join(dir, "bench.db"))
	require.NoError(b, err)

	postings := model.GenerateSyntheticPostings(50000)
	require.NoError(b, posting.UpsertAll(db, postings))
	prices := model.GenerateSyntheticPrices(1000)
	require.NoError(b, price.UpsertAllByType(db, "unknown", prices))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		c := &priceCache{}
		_, _ = c.getTrees(db, "GOLD")
	}
}
