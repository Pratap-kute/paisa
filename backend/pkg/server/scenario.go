package server

import (
	"errors"
	"strconv"

	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/api/mapper"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func scenarioFailure(c *gin.Context, err error) {
	var validation *service.ScenarioError
	if errors.As(err, &validation) && validation.Code != "scenario_calculation_failed" {
		c.JSON(400, gin.H{"code": validation.Code, "month": validation.Month})
		return
	}
	c.JSON(500, gin.H{"code": "scenario_calculation_failed"})
}

// GetScenarioBaselineHandler godoc
// @ID getScenarioBaseline
// @Summary Current assumptions for a what-if comparison
// @Tags Scenario
// @Produce json
// @Security PaisaAuth
// @Param horizonMonths query int false "Projection months, 1–120 (default 60)"
// @Success 200 {object} dto.ScenarioBaseline
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /scenario/baseline [get]
func GetScenarioBaselineHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		horizon := 60
		if values, ok := c.Request.URL.Query()["horizonMonths"]; ok {
			var err error
			if len(values) != 1 {
				scenarioFailure(c, &service.ScenarioError{Code: "invalid_scenario_horizon"})
				return
			}
			horizon, err = strconv.Atoi(values[0])
			if err != nil {
				scenarioFailure(c, &service.ScenarioError{Code: "invalid_scenario_horizon"})
				return
			}
		}
		b, err := service.BuildScenarioBaseline(db, utils.Now(), horizon)
		if err != nil {
			scenarioFailure(c, err)
			return
		}
		c.JSON(200, mapper.ScenarioBaselineToDTO(b))
	}
}

// EvaluateScenarioHandler godoc
// @ID evaluateScenario
// @Summary Compare a temporary scenario against the current trajectory
// @Tags Scenario
// @Accept json
// @Produce json
// @Security PaisaAuth
// @Param request body dto.ScenarioRequest true "Absolute overrides; annual returns are ratios"
// @Success 200 {object} dto.ScenarioResult
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /scenario/evaluate [post]
func EvaluateScenarioHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request dto.ScenarioRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			scenarioFailure(c, &service.ScenarioError{Code: "invalid_scenario"})
			return
		}
		b, err := service.BuildScenarioBaseline(db, utils.Now(), request.HorizonMonths)
		if err != nil {
			scenarioFailure(c, err)
			return
		}
		r, err := service.EvaluateScenario(b, mapper.ScenarioRequestFromDTO(request))
		if err != nil {
			scenarioFailure(c, err)
			return
		}
		c.JSON(200, mapper.ScenarioResultToDTO(r))
	}
}
