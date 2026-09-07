package server

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestScenarioAPIContract(t *testing.T) {
	db := setupContractTestDB(t, "")
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)
	date := time.Date(2026, 8, 1, 0, 0, 0, 0, time.Local)
	ps := []posting.Posting{}
	for _, v := range []struct{ account, amount string }{{"Assets:Checking", "100000.25"}, {"Assets:Fund", "100000"}, {"Income:Salary", "-50000"}, {"Expenses:Food", "30000"}} {
		ps = append(ps, contractPosting(date, v.account, "INR", v.amount, v.amount))
	}
	require.NoError(t, db.Create(&ps).Error)
	writes := 0
	require.NoError(t, db.Callback().Create().Before("gorm:create").Register("scenario_no_create", func(_ *gorm.DB) { writes++ }))
	require.NoError(t, db.Callback().Update().Before("gorm:update").Register("scenario_no_update", func(_ *gorm.DB) { writes++ }))
	require.NoError(t, db.Callback().Delete().Before("gorm:delete").Register("scenario_no_delete", func(_ *gorm.DB) { writes++ }))
	router := gin.New()
	router.GET("/baseline", GetScenarioBaselineHandler(db))
	router.POST("/evaluate", EvaluateScenarioHandler(db))
	for _, tc := range []struct {
		method, path, body, code string
		status                   int
	}{
		{"GET", "/baseline", "", "", 200}, {"GET", "/baseline?horizonMonths=120", "", "", 200},
		{"GET", "/baseline?horizonMonths=0", "", "invalid_scenario_horizon", 400}, {"GET", "/baseline?horizonMonths=x", "", "invalid_scenario_horizon", 400}, {"GET", "/baseline?horizonMonths=1&horizonMonths=2", "", "invalid_scenario_horizon", 400},
		{"POST", "/evaluate", `{"horizonMonths":1}`, "", 200},
		{"POST", "/evaluate", `{"horizonMonths":12,"monthlyIncome":150000,"monthlyExpenses":80000,"monthlyInvestmentTransfer":40000,"annualInvestmentReturn":0.08,"scenarioAnnualInvestmentReturn":-0.1,"oneTimeEvents":[{"month":"2026-10","type":"cash_inflow","amount":500000,"label":"Bonus"}]}`, "", 200},
		{"POST", "/evaluate", `{"horizonMonths":1,"monthlyExpenses":500000}`, "", 200},
		{"POST", "/evaluate", `{"horizonMonths":1,"annualInvestmentReturn":-1}`, "invalid_scenario_return", 400},
		{"POST", "/evaluate", `{"horizonMonths":1,"monthlyIncome":-1}`, "invalid_scenario", 400},
		{"POST", "/evaluate", `{"horizonMonths":1,"monthlyInvestmentTransfer":-999999}`, "scenario_insufficient_investment_balance", 400},
		{"POST", "/evaluate", `{"horizonMonths":1,"oneTimeEvents":[{"month":"2026-11","type":"cash_inflow","amount":1}]}`, "invalid_scenario_event", 400},
		{"POST", "/evaluate", `{`, "invalid_scenario", 400},
	} {
		t.Run(tc.path+tc.body, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)
			require.Equal(t, tc.status, w.Code, w.Body.String())
			var body map[string]any
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
			if tc.code != "" {
				require.Equal(t, tc.code, body["code"])
			} else if tc.method == "GET" {
				v, err := decimal.NewFromString(strings.Trim(string(mustScenarioJSON(t, body["currentCash"])), `"`))
				require.NoError(t, err)
				require.True(t, v.Equal(decimal.RequireFromString("100000.25")))
			} else {
				require.Equal(t, true, body["available"])
				require.NotNil(t, body["quality"])
			}
		})
	}
	require.Zero(t, writes)
}
func mustScenarioJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return b
}
func TestScenarioAPIUnavailableAndFailure(t *testing.T) {
	db := setupContractTestDB(t, "")
	utils.SetNow("2026-09-07")
	t.Cleanup(utils.ResetNow)
	router := gin.New()
	router.POST("/evaluate", EvaluateScenarioHandler(db))
	router.GET("/baseline", GetScenarioBaselineHandler(db))
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/evaluate", strings.NewReader(`{"horizonMonths":60,"monthlyIncome":150000,"monthlyExpenses":0,"monthlyInvestmentTransfer":0}`))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)
	require.Equal(t, 200, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, false, body["available"])
	require.Nil(t, body["baseline"])
	require.Nil(t, body["scenario"])
	require.Nil(t, body["impact"])
	require.NoError(t, db.Migrator().DropTable(&posting.Posting{}))
	w = httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("GET", "/baseline", nil))
	require.Equal(t, 500, w.Code)
	require.JSONEq(t, `{"code":"scenario_calculation_failed"}`, w.Body.String())
}
