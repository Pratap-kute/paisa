package model

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/model/price"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupBenchDB(b *testing.B, numPostings int) *gorm.DB {
	b.Helper()
	dir := b.TempDir()
	dbPath := filepath.Join(dir, "bench.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Discard,
	})
	require.NoError(b, err)
	require.NoError(b, AutoMigrate(db))

	if numPostings > 0 {
		postings := GenerateSyntheticPostings(numPostings)
		require.NoError(b, posting.UpsertAll(db, postings))
	}
	return db
}

func BenchmarkPosting_UpsertAll_1k(b *testing.B) {
	postings := GenerateSyntheticPostings(1000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		dir := b.TempDir()
		db, _ := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
		_ = AutoMigrate(db)
		b.StartTimer()

		_ = posting.UpsertAll(db, postings)
	}
}

func BenchmarkPosting_UpsertAll_10k(b *testing.B) {
	postings := GenerateSyntheticPostings(10000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		dir := b.TempDir()
		db, _ := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
		_ = AutoMigrate(db)
		b.StartTimer()

		_ = posting.UpsertAll(db, postings)
	}
}

func BenchmarkPosting_UpsertAll_50k(b *testing.B) {
	postings := GenerateSyntheticPostings(50000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		dir := b.TempDir()
		db, _ := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
		_ = AutoMigrate(db)
		b.StartTimer()

		_ = posting.UpsertAll(db, postings)
	}
}

func BenchmarkPrice_UpsertAllByType_1k(b *testing.B) {
	prices := GenerateSyntheticPrices(1000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		dir := b.TempDir()
		db, _ := gorm.Open(sqlite.Open(filepath.Join(dir, "bench.db")), &gorm.Config{Logger: logger.Discard})
		_ = AutoMigrate(db)
		b.StartTimer()

		_ = price.UpsertAllByType(db, config.Stock, prices)
	}
}

func BenchmarkQuery_All_10k(b *testing.B) {
	db := setupBenchDB(b, 10000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).All()
	}
}

func BenchmarkQuery_All_50k(b *testing.B) {
	db := setupBenchDB(b, 50000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).All()
	}
}

func BenchmarkQuery_AccountPrefix_10k(b *testing.B) {
	db := setupBenchDB(b, 10000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).AccountPrefix("Expenses:Food").All()
	}
}

func BenchmarkQuery_AccountPrefix_50k(b *testing.B) {
	db := setupBenchDB(b, 50000)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).AccountPrefix("Expenses:Food").All()
	}
}

func BenchmarkQuery_DateRange_10k(b *testing.B) {
	db := setupBenchDB(b, 10000)
	start := time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).Where("date >= ? and date < ?", start, end).All()
	}
}

func BenchmarkQuery_DateRange_50k(b *testing.B) {
	db := setupBenchDB(b, 50000)
	start := time.Date(2022, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = query.Init(db).Where("date >= ? and date < ?", start, end).All()
	}
}
