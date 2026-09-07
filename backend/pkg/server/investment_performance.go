package server

import (
	"errors"
	"strconv"

	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetInvestmentPerformanceHandler godoc
// @ID getInvestmentPerformance
// @Summary Selected-period investment performance
// @Tags Investment
// @Produce json
// @Security PaisaAuth
// @Param preset query string false "current_fy, previous_fy, one_year, since_inception"
// @Param from query string false "Inclusive start YYYY-MM-DD"
// @Param to query string false "Inclusive end YYYY-MM-DD"
// @Param accountPrefix query string false "Exact investment account or ancestor"
// @Param timeline query boolean false "Include boundary timeline"
// @Param drivers query boolean false "Include exact-account drivers"
// @Success 200 {object} dto.InvestmentPerformance
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /investment/performance [get]
func GetInvestmentPerformanceHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, key := range []string{"preset", "from", "to", "timeline", "drivers", "accountPrefix"} {
			values, exists := c.Request.URL.Query()[key]
			if exists && (len(values) != 1 || values[0] == "") {
				c.JSON(400, gin.H{"code": "invalid_investment_performance_range"})
				return
			}
		}
		o := service.PerformanceOptions{Preset: c.Query("preset"), From: c.Query("from"), To: c.Query("to"), AccountPrefix: c.Query("accountPrefix")}
		for key, target := range map[string]*bool{"timeline": &o.Timeline, "drivers": &o.Drivers} {
			if raw, ok := c.GetQuery(key); ok {
				value, err := strconv.ParseBool(raw)
				if err != nil {
					c.JSON(400, gin.H{"code": "invalid_investment_performance_range"})
					return
				}
				*target = value
			}
		}
		r, err := service.GetInvestmentPerformance(db, o)
		if err != nil {
			status, code := 500, "investment_performance_failed"
			if errors.Is(err, service.ErrPerformanceRange) {
				status, code = 400, err.Error()
			}
			if errors.Is(err, service.ErrPerformanceReconciliation) {
				code = err.Error()
			}
			c.JSON(status, gin.H{"code": code})
			return
		}
		c.JSON(200, mapper.InvestmentPerformanceToDTO(r))
	}
}
