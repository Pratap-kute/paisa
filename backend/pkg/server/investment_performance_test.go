package server

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestInvestmentPerformanceContract(t *testing.T) {
	db := setupContractTestDB(t, "")
	utils.SetNow("2026-09-06")
	t.Cleanup(utils.ResetNow)
	p := contractPosting(time.Date(2026, 9, 6, 0, 0, 0, 0, time.Local), "Assets:Fund", "INR", "1000", "1000")
	require.NoError(t, db.Create(&[]posting.Posting{p}).Error)
	router := gin.New()
	router.GET("/investment/performance", GetInvestmentPerformanceHandler(db))
	for _, tc := range []struct {
		query  string
		status int
	}{
		{"?from=2026-09-06&to=2026-09-06", 200}, {"?preset=current_fy&drivers=true&timeline=true", 200},
		{"?from=bad&to=2026-09-06", 400}, {"?from=2026-09-06", 400}, {"?preset=bad", 400}, {"?timeline=banana", 400}, {"?accountPrefix=Assets:Checking", 400},
	} {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest("GET", "/investment/performance"+tc.query, nil))
		require.Equal(t, tc.status, w.Code, w.Body.String())
		if tc.status == 200 {
			var raw map[string]any
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &raw))
			require.Nil(t, raw["periodReturn"])
			require.Equal(t, "insufficient_weighted_capital", raw["returnUnavailableReason"])
		}
	}
	expected, err := service.GetInvestmentPerformance(db, service.PerformanceOptions{Preset: "current_fy"})
	require.NoError(t, err)
	dashboard := GetDashboard(db)
	actual := dashboard["investmentPerformance"].(*dto.InvestmentPerformance)
	require.Equal(t, mapper.InvestmentPerformanceToDTO(expected), *actual)
	require.NotNil(t, actual.SinceInceptionXIRR)
}
