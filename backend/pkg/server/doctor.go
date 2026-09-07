package server

import (
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/service"
	"gorm.io/gorm"
)

// GetDiagnosis delegates to the canonical diagnosis service and adapts results to the DTO response.
func GetDiagnosis(db *gorm.DB) dto.DiagnosisResponse {
	res := service.GetDiagnosis(db)

	issues := make([]dto.IssueResponse, 0, len(res.Issues))
	for i := range res.Issues {
		issue := &res.Issues[i]
		var entity *dto.IssueEntity
		if issue.Entity != nil {
			entity = &dto.IssueEntity{
				Type:  issue.Entity.Type,
				ID:    issue.Entity.ID,
				Label: issue.Entity.Label,
			}
		}
		var action *dto.IssueAction
		if issue.Action != nil {
			action = &dto.IssueAction{
				Label: issue.Action.Label,
				Href:  issue.Action.Href,
			}
		}

		issues = append(issues, dto.IssueResponse{
			Level:            string(issue.Level),
			Summary:          issue.Summary,
			Description:      issue.Description,
			Details:          issue.Details,
			Code:             issue.Code,
			Category:         string(issue.Category),
			Entity:           entity,
			AffectedFeatures: issue.AffectedFeatures,
			Action:           action,
			Metadata:         issue.Metadata,
		})
	}

	checks := make([]dto.DiagnosticCheckResponse, 0, len(res.Checks))
	for _, c := range res.Checks {
		var maxSev *string
		if c.MaxSeverity != nil {
			s := string(*c.MaxSeverity)
			maxSev = &s
		}
		checks = append(checks, dto.DiagnosticCheckResponse{
			Code:        c.Code,
			Name:        c.Name,
			Category:    string(c.Category),
			Status:      string(c.Status),
			MaxSeverity: maxSev,
			IssueCount:  c.IssueCount,
		})
	}

	return dto.DiagnosisResponse{
		Summary: dto.DiagnosisSummaryResponse{
			Total:        res.Summary.Total,
			Danger:       res.Summary.Danger,
			Warning:      res.Summary.Warning,
			Info:         res.Summary.Info,
			PassedChecks: res.Summary.PassedChecks,
			FailedChecks: res.Summary.FailedChecks,
			TotalChecks:  res.Summary.TotalChecks,
		},
		Issues: issues,
		Checks: checks,
	}
}
