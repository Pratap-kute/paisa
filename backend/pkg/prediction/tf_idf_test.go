package prediction

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func predictionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&posting.Posting{}))
	ClearCache()
	t.Cleanup(func() {
		ClearCache()
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}

func predictionPosting(account, payee string, amt float64) posting.Posting {
	return posting.Posting{
		TransactionID: account + payee,
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
		Account:       account,
		Payee:         payee,
		Commodity:     "INR",
		Amount:        decimal.NewFromFloat(amt),
		MarketAmount:  decimal.NewFromFloat(amt),
	}
}

func TestTokenize(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{
			name:  "simple string",
			input: "Coffee Shop",
			want:  []string{"coffee", "shop"},
		},
		{
			name:  "string with delimiters and numbers",
			input: "150.50 (Starbucks/Indiranagar)",
			want:  []string{"150", "50", "starbucks", "indiranagar"},
		},
		{
			name:  "delimiters with extra spaces",
			input: "   Amazon : India / Retail   ",
			want:  []string{"amazon", "india", "retail"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tokenize(tt.input)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBuildIndexAndTfIdf(t *testing.T) {
	postings := []posting.Posting{
		predictionPosting("Expenses:Food", "Starbucks Coffee", 250),
		predictionPosting("Expenses:Food", "Blue Tokai Coffee", 300),
		predictionPosting("Expenses:Travel", "Uber Ride", 450),
	}

	idx := buldIndex(postings)

	// Check document term counts
	assert.Contains(t, idx.Docs, "Expenses:Food")
	assert.Contains(t, idx.Docs, "Expenses:Travel")
	assert.Equal(t, int64(2), idx.Docs["Expenses:Food"]["coffee"])
	assert.Equal(t, int64(1), idx.Docs["Expenses:Travel"]["uber"])

	// Check token account counts
	assert.Equal(t, int64(2), idx.Tokens["coffee"]["Expenses:Food"])
	assert.Equal(t, int64(1), idx.Tokens["uber"]["Expenses:Travel"])

	// Compute TF-IDF weights
	foodVector := tfidf("Expenses:Food", idx)
	assert.NotEmpty(t, foodVector)
	assert.True(t, foodVector["coffee"] > 0, "coffee weight should be positive")
}

func TestGetTfIdfWithDB(t *testing.T) {
	db := predictionTestDB(t)

	posts := []posting.Posting{
		predictionPosting("Expenses:Food", "Grocery Store", 100),
		predictionPosting("Expenses:Utilities", "Electricity Bill", 200),
	}
	require.NoError(t, db.Create(&posts).Error)

	result := GetTfIdf(db)
	require.NotNil(t, result["tf_idf"])
	require.NotNil(t, result["index"])

	vector, ok := result["tf_idf"].(map[string]map[string]float64)
	require.True(t, ok)
	assert.Contains(t, vector, "Expenses:Food")
	assert.Contains(t, vector, "Expenses:Utilities")
}
