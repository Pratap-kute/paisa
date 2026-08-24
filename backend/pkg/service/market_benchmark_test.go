package service

import (
	"path/filepath"
	"testing"

	"github.com/ananthakumaran/paisa/pkg/model"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func BenchmarkMarket_GetTrees_10k(b *testing.B) {
	dir := b.TempDir()
	db, err := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
	require.NoError(b, err)
	require.NoError(b, model.AutoMigrate(db))

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
	db, err := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
	require.NoError(b, err)
	require.NoError(b, model.AutoMigrate(db))

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
