package server

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/api/dto"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/service"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Level string

const (
	WARN  Level = "warning"
	ERROR Level = "danger"
)

type Issue struct {
	Level       Level  `json:"level"`
	Summary     string `json:"summary"`
	Description string `json:"description"`
	Details     string `json:"details"`
}

type Rule struct {
	Issue     Issue
	Predicate func(db *gorm.DB) []error
}

const DateFormat = "02 Jan 2006"

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
			TotalChecks:  res.Summary.TotalChecks,
		},
		Issues: issues,
		Checks: checks,
	}
}

func ruleAssetRegisterNonNegative(db *gorm.DB) []error {
	errs := make([]error, 0)
	assets := query.Init(db).Like("Assets:%").All()
	for account, ps := range lo.GroupBy(assets, func(posting posting.Posting) string { return posting.Account }) {
		for _, balance := range accounting.Register(ps) {
			if balance.Quantity.LessThan(decimal.NewFromFloat(0.01).Neg()) {
				errs = append(errs, fmt.Errorf("<b>%s</b> account went negative (%.2f) on %s", account, balance.Quantity.InexactFloat64(), balance.Date.Format(DateFormat)))
				break
			}
		}
	}
	return errs
}

func ruleNonCreditAccount(db *gorm.DB) []error {
	errs := make([]error, 0)
	incomes := query.Init(db).Like("Income:%").NotLike("Income:CapitalGains:%").All()
	for i := range incomes {
		p := &incomes[i]
		if p.Amount.GreaterThan(decimal.NewFromFloat(0.01)) {
			errs = append(errs, fmt.Errorf("<b>%.4f</b> got credited to <b>%s</b> on %s", p.Amount.InexactFloat64(), p.Account, p.Date.Format(DateFormat)))
		}
	}
	return errs
}

func ruleNonDebitAccount(db *gorm.DB) []error {
	errs := make([]error, 0)
	incomes := query.Init(db).Like("Expenses:%").All()
	for i := range incomes {
		p := &incomes[i]
		if p.Amount.LessThan(decimal.NewFromFloat(0.01).Neg()) {
			errs = append(errs, fmt.Errorf("<b>%.4f</b> got debited from <b>%s</b> on %s", p.Amount.InexactFloat64(), p.Account, p.Date.Format(DateFormat)))
		}
	}
	return errs
}

func ruleAllocationTargetMissingAssetAccounts(db *gorm.DB) []error {
	errs := make([]error, 0)

	if len(config.GetConfig().AllocationTargets) == 0 {
		return errs
	}

	var accounts []string
	db.Model(&posting.Posting{}).Where("account like ?", "Assets:%").Distinct().Pluck("Account", &accounts)

	ignoredAccounts := make([]string, 0)
	for _, account := range accounts {
		found := false
		for _, target := range config.GetConfig().AllocationTargets {
			for _, targetAccount := range target.Accounts {
				match, err := filepath.Match(targetAccount, account)
				if err == nil && match {
					found = true
					break
				}
			}

			if found {
				break
			}
		}

		if !found {
			ignoredAccounts = append(ignoredAccounts, account)
		}
	}

	if len(ignoredAccounts) > 0 {
		errs = append(errs, fmt.Errorf("the following asset accounts are not part of any asset allocation target: <b>%s</b>", strings.Join(ignoredAccounts, ", ")))
	}

	return errs
}
