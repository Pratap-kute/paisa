package server

import (
	"net/http"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetInsightsHandler godoc
//
// @ID getInsights
// @Summary Get deterministic financial health insights
// @Description Returns deterministic financial observations and risks derived from ledger history
// @Tags Insights
// @Produce json
// @Param period query string false "Month period in YYYY-MM format (defaults to current month)"
// @Success 200 {object} dto.InsightsResponse
// @Failure 400 {object} dto.ErrorResponse
// @Security PaisaAuth
// @Router /insights [get]
func GetInsightsHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		period := c.Query("period")
		result, err := service.GetInsights(db, period)
		if err != nil {
			c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Error:   "bad_request",
				Message: err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, mapper.InsightsToDTO(result))
	}
}
