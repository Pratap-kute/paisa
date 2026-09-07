package server

import (
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetDiagnosis(t *testing.T) {
	db := serverTestDB(t, false)

	// Clean diagnosis on empty/clean DB
	diagnosis := GetDiagnosis(db)
	assert.Empty(t, diagnosis.Issues)
	assert.NotEmpty(t, diagnosis.Checks)
	assert.Equal(t, 11, diagnosis.Summary.TotalChecks)
	assert.Equal(t, 0, diagnosis.Summary.FailedChecks)
	assert.Equal(t, 11, diagnosis.Summary.PassedChecks)
}

func TestGetDiagnosisWithIssue(t *testing.T) {
	db := serverTestDB(t, false)

	// Negative asset posting should produce a danger issue
	p := posting.Posting{
		TransactionID: "tx-neg",
		Date:          time.Date(2024, time.January, 1, 0, 0, 0, 0, time.Local),
		Account:       "Assets:Checking:SBI",
		Commodity:     "INR",
		Quantity:      decimal.NewFromFloat(-100),
		Amount:        decimal.NewFromFloat(-100),
		MarketAmount:  decimal.NewFromFloat(-100),
	}
	require.NoError(t, db.Create(&p).Error)

	diagnosis := GetDiagnosis(db)
	assert.NotEmpty(t, diagnosis.Issues)
	assert.Greater(t, diagnosis.Summary.Danger, 0)
	assert.Equal(t, 0, diagnosis.Summary.FailedChecks)
}
