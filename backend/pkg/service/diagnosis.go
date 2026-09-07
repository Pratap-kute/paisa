package service

import (
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ananthakumaran/paisa/pkg/accounting"
	"github.com/ananthakumaran/paisa/pkg/config"
	"github.com/ananthakumaran/paisa/pkg/model/posting"
	"github.com/ananthakumaran/paisa/pkg/query"
	"github.com/ananthakumaran/paisa/pkg/utils"
	"github.com/samber/lo"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const DateFormat = "02 Jan 2006"

const (
	FeatureNetWorth              = "net_worth"
	FeatureBalanceSheet          = "balance_sheet"
	FeatureIncomeStatement       = "income_statement"
	FeatureInvestmentPerformance = "investment_performance"
	FeatureScenarios             = "scenarios"
	FeatureAllocation            = "allocation"
	FeatureCommodities           = "commodities"

	entityAccount   = "account"
	entityCommodity = "commodity"

	actionEditTransaction = "Edit Transaction"
	actionReviewPrices    = "Review Prices"
	actionReviewScenarios = "Review Scenarios"

	urlPrices        = "/ledger/price"
	urlScenarios     = "/more/scenarios"
	urlPerformance   = "/assets/gain"
	urlAllocation    = "/assets/allocation"
	urlConfig        = "/more/config"
	urlAssetsBalance = "/assets/balance"

	metaDate    = "date"
	metaAmount  = "amount"
	metaSource  = "source"
	metaSamples = "samples"

	accountAssetsChecking = "Assets:Checking"
)

// formatEditorURL generates a deep-link URL into Paisa's ledger editor.
func formatEditorURL(p posting.Posting) string {
	return fmt.Sprintf("/ledger/editor/%s#%d", url.PathEscape(p.FileName), p.TransactionBeginLine)
}

// formatPostingText formats a posting as clean human-readable text.
func formatPostingText(p posting.Posting) string {
	var price string
	if p.Quantity.Equal(p.Amount) {
		price = fmt.Sprintf("%.4f %s", p.Quantity.InexactFloat64(), p.Commodity)
	} else {
		price = fmt.Sprintf("%.4f %s @ %.4f %s", p.Quantity.InexactFloat64(), p.Commodity, p.Price().InexactFloat64(), config.DefaultCurrency())
	}
	return fmt.Sprintf("%s\t%s\t%s", p.Date.Format(DateFormat), p.Account, price)
}

type diagnosisContext struct {
	db *gorm.DB

	currentFYPerformance       InvestmentPerformance
	currentFYPerformanceErr    error
	currentFYPerformanceLoaded bool

	scenarioBaseline       ScenarioBaseline
	scenarioBaselineErr    error
	scenarioBaselineLoaded bool
}

func newDiagnosisContext(db *gorm.DB) *diagnosisContext {
	return &diagnosisContext{db: db}
}

func (ctx *diagnosisContext) GetCurrentFYPerformance() (InvestmentPerformance, error) {
	if !ctx.currentFYPerformanceLoaded {
		ctx.currentFYPerformanceLoaded = true
		ctx.currentFYPerformance, ctx.currentFYPerformanceErr = GetInvestmentPerformance(ctx.db, PerformanceOptions{
			Preset:  PerformancePresetCurrentFY,
			Drivers: true,
		})
	}
	return ctx.currentFYPerformance, ctx.currentFYPerformanceErr
}

func (ctx *diagnosisContext) GetScenarioBaseline() (ScenarioBaseline, error) {
	if !ctx.scenarioBaselineLoaded {
		ctx.scenarioBaselineLoaded = true
		ctx.scenarioBaseline, ctx.scenarioBaselineErr = BuildScenarioBaseline(ctx.db, utils.Now(), 1)
	}
	return ctx.scenarioBaseline, ctx.scenarioBaselineErr
}

type checkDefinition struct {
	Code     string
	Name     string
	Category QualityCategory
	Run      func(ctx *diagnosisContext) ([]QualityIssue, error)
}

// GetDiagnosis runs all 11 canonical diagnostic checks against the database and returns structured results.
func GetDiagnosis(db *gorm.DB) DiagnosisResult {
	dctx := newDiagnosisContext(db)
	checks := []checkDefinition{
		{Code: "asset_balance_integrity", Name: "Asset Balance Integrity", Category: CategoryLedger, Run: checkAssetBalanceIntegrity},
		{Code: "posting_direction", Name: "Posting Direction", Category: CategoryLedger, Run: checkPostingDirection},
		{Code: "exchange_price_coverage", Name: "Exchange Price Coverage", Category: CategoryValuation, Run: checkExchangePriceCoverage},
		{Code: "journal_price_consistency", Name: "Journal Price Consistency", Category: CategoryValuation, Run: checkJournalPriceConsistency},
		{Code: "allocation_configuration", Name: "Allocation Configuration", Category: CategoryConfiguration, Run: checkAllocationConfiguration},
		{Code: "current_valuation_quality", Name: "Current Valuation Quality", Category: CategoryValuation, Run: checkCurrentValuationQuality},
		{Code: "current_fy_valuation_quality", Name: "Current FY Performance Valuation Quality", Category: CategoryValuation, Run: checkCurrentFYValuationQuality},
		{Code: "investment_income_attribution", Name: "Investment Income Attribution", Category: CategoryInvestments, Run: checkInvestmentIncomeAttribution},
		{Code: "performance_reconciliation", Name: "Performance Reconciliation", Category: CategoryInvestments, Run: checkPerformanceReconciliation},
		{Code: "scenario_history_readiness", Name: "Scenario History Readiness", Category: CategoryHistory, Run: checkScenarioHistoryReadiness},
		{Code: "scenario_checking_readiness", Name: "Scenario Checking Account Readiness", Category: CategoryConfiguration, Run: checkScenarioCheckingReadiness},
	}

	allIssues := make([]QualityIssue, 0)
	checkResults := make([]DiagnosticCheck, 0, len(checks))

	for _, def := range checks {
		issues, err := runSafeCheck(dctx, def.Run)
		check := DiagnosticCheck{
			Code:       def.Code,
			Name:       def.Name,
			Category:   def.Category,
			IssueCount: len(issues),
		}

		switch {
		case err != nil:
			check.Status = CheckStatusFailed
		case len(issues) == 0:
			check.Status = CheckStatusPassed
		default:
			check.Status = CheckStatusIssues
			maxSev := highestSeverity(issues)
			check.MaxSeverity = &maxSev
			allIssues = append(allIssues, issues...)
		}
		checkResults = append(checkResults, check)
	}

	sortIssues(allIssues)

	summary := calculateDiagnosisSummary(allIssues, checkResults)

	return DiagnosisResult{
		Summary: summary,
		Issues:  allIssues,
		Checks:  checkResults,
	}
}

func runSafeCheck(ctx *diagnosisContext, fn func(ctx *diagnosisContext) ([]QualityIssue, error)) (issues []QualityIssue, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("check panicked: %v", r)
		}
	}()
	return fn(ctx)
}

func highestSeverity(issues []QualityIssue) QualityLevel {
	hasDanger := false
	hasWarning := false
	for i := range issues {
		switch issues[i].Level {
		case LevelDanger:
			hasDanger = true
		case LevelWarning:
			hasWarning = true
		case LevelInfo:
			// Info does not elevate check severity
		}
	}
	if hasDanger {
		return LevelDanger
	}
	if hasWarning {
		return LevelWarning
	}
	return LevelInfo
}

func calculateDiagnosisSummary(issues []QualityIssue, checks []DiagnosticCheck) DiagnosisSummary {
	summary := DiagnosisSummary{
		Total:       len(issues),
		TotalChecks: len(checks),
	}
	for i := range issues {
		switch issues[i].Level {
		case LevelDanger:
			summary.Danger++
		case LevelWarning:
			summary.Warning++
		case LevelInfo:
			summary.Info++
		}
	}
	for i := range checks {
		switch checks[i].Status {
		case CheckStatusPassed:
			summary.PassedChecks++
		case CheckStatusFailed:
			summary.FailedChecks++
		case CheckStatusIssues:
			// issues count towards summary.Total, not passed/failed checks
		}
	}
	return summary
}

func severityRank(level QualityLevel) int {
	switch level {
	case LevelDanger:
		return 0
	case LevelWarning:
		return 1
	case LevelInfo:
		return 2
	default:
		return 3
	}
}

func categoryRank(cat QualityCategory) int {
	switch cat {
	case CategoryLedger:
		return 0
	case CategoryValuation:
		return 1
	case CategoryInvestments:
		return 2
	case CategoryAllocation:
		return 3
	case CategoryConfiguration:
		return 4
	case CategoryHistory:
		return 5
	case CategoryTransactions:
		return 6
	default:
		return 7
	}
}

func sortIssues(issues []QualityIssue) {
	sort.SliceStable(issues, func(i, j int) bool {
		si, sj := severityRank(issues[i].Level), severityRank(issues[j].Level)
		if si != sj {
			return si < sj
		}
		ci, cj := categoryRank(issues[i].Category), categoryRank(issues[j].Category)
		if ci != cj {
			return ci < cj
		}
		if issues[i].Code != issues[j].Code {
			return issues[i].Code < issues[j].Code
		}
		idI := ""
		if issues[i].Entity != nil {
			idI = issues[i].Entity.ID
		}
		idJ := ""
		if issues[j].Entity != nil {
			idJ = issues[j].Entity.ID
		}
		if idI != idJ {
			return idI < idJ
		}
		return issues[i].Summary < issues[j].Summary
	})
}

// 1. Asset balance integrity: running balance of asset account must not be negative.
func checkAssetBalanceIntegrity(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)
	assets := query.Init(db).Like("Assets:%").All()

	for account, ps := range lo.GroupBy(assets, func(p posting.Posting) string { return p.Account }) {
		for _, balance := range accounting.Register(ps) {
			if balance.Quantity.LessThan(decimal.NewFromFloat(0.01).Neg()) {
				issues = append(issues, QualityIssue{
					Code:        "negative_asset_balance",
					Level:       LevelDanger,
					Category:    CategoryLedger,
					Summary:     "Negative Asset Balance",
					Description: "The running balance of an asset account must not go negative at any point. A negative balance typically indicates missing, duplicate, or misordered transactions.",
					Details:     fmt.Sprintf("%s went negative (%s) on %s", account, balance.Quantity.StringFixed(2), balance.Date.Format(DateFormat)),
					Entity: &IssueEntity{
						Type:  entityAccount,
						ID:    account,
						Label: account,
					},
					AffectedFeatures: []string{FeatureNetWorth, FeatureBalanceSheet},
					Action: &IssueAction{
						Label: "View Account",
						Href:  urlAssetsBalance,
					},
					Metadata: map[string]string{
						entityAccount: account,
						metaDate:      balance.Date.Format("2006-01-02"),
						metaAmount:    balance.Quantity.StringFixed(2),
					},
				})
				break
			}
		}
	}
	return issues, nil
}

// 2. Posting direction: positive income (invalid credit) or negative expense (invalid debit).
func checkPostingDirection(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)

	// Income should not be credited with a positive amount (excluding capital gains)
	incomes := query.Init(db).Like("Income:%").NotLike("Income:CapitalGains:%").All()
	for i := range incomes {
		p := &incomes[i]
		if p.Amount.GreaterThan(decimal.NewFromFloat(0.01)) {
			issues = append(issues, QualityIssue{
				Code:        "invalid_income_direction",
				Level:       LevelDanger,
				Category:    CategoryLedger,
				Summary:     "Invalid Income Posting Direction",
				Description: "Income postings should normally be credited (negative amounts in ledger format). A positive amount increases income incorrectly.",
				Details:     fmt.Sprintf("%s was credited with positive amount %s on %s: %s", p.Account, p.Amount.StringFixed(2), p.Date.Format(DateFormat), formatPostingText(*p)),
				Entity: &IssueEntity{
					Type:  entityAccount,
					ID:    p.Account,
					Label: p.Account,
				},
				AffectedFeatures: []string{FeatureIncomeStatement, FeatureScenarios},
				Action: &IssueAction{
					Label: actionEditTransaction,
					Href:  formatEditorURL(*p),
				},
				Metadata: map[string]string{
					entityAccount: p.Account,
					metaDate:      p.Date.Format("2006-01-02"),
					metaAmount:    p.Amount.StringFixed(2),
				},
			})
		}
	}

	// Expenses should not be debited with a negative amount
	expenses := query.Init(db).Like("Expenses:%").All()
	for i := range expenses {
		p := &expenses[i]
		if p.Amount.LessThan(decimal.NewFromFloat(0.01).Neg()) {
			issues = append(issues, QualityIssue{
				Code:        "invalid_expense_direction",
				Level:       LevelDanger,
				Category:    CategoryLedger,
				Summary:     "Invalid Expense Posting Direction",
				Description: "Expense postings should normally be debited (positive amounts). A negative amount decreases expenses unexpectedly unless part of an intentional refund.",
				Details:     fmt.Sprintf("%s was debited with negative amount %s on %s: %s", p.Account, p.Amount.StringFixed(2), p.Date.Format(DateFormat), formatPostingText(*p)),
				Entity: &IssueEntity{
					Type:  entityAccount,
					ID:    p.Account,
					Label: p.Account,
				},
				AffectedFeatures: []string{FeatureIncomeStatement, FeatureScenarios},
				Action: &IssueAction{
					Label: actionEditTransaction,
					Href:  formatEditorURL(*p),
				},
				Metadata: map[string]string{
					entityAccount: p.Account,
					metaDate:      p.Date.Format("2006-01-02"),
					metaAmount:    p.Amount.StringFixed(2),
				},
			})
		}
	}

	return issues, nil
}

// 3. Exchange price coverage: missing exchange price for non-currency foreign commodities.
func checkExchangePriceCoverage(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)
	postings := query.Init(db).Desc().All()

	seen := make(map[string]bool)
	for i := range postings {
		p := &postings[i]
		if !utils.IsCurrency(p.Commodity) {
			externalPrice := GetUnitPrice(db, p.Commodity, p.Date)
			if externalPrice.CommodityName != "" && externalPrice.CommodityName != p.Commodity {
				key := p.Commodity + ":" + p.Date.Format("2006-01-02")
				if seen[key] {
					continue
				}
				seen[key] = true
				issues = append(issues, QualityIssue{
					Code:        "missing_exchange_price",
					Level:       LevelDanger,
					Category:    CategoryValuation,
					Summary:     "Missing Exchange Price",
					Description: fmt.Sprintf("Exchange price from %s to your default currency %s is missing for valuation.", p.Commodity, config.DefaultCurrency()),
					Details:     fmt.Sprintf("Exchange price from %s to your default currency %s is not specified for posting %s", p.Commodity, config.DefaultCurrency(), formatPostingText(*p)),
					Entity: &IssueEntity{
						Type:  entityCommodity,
						ID:    p.Commodity,
						Label: p.Commodity,
					},
					AffectedFeatures: []string{FeatureNetWorth, FeatureInvestmentPerformance},
					Action: &IssueAction{
						Label: actionReviewPrices,
						Href:  urlPrices,
					},
					Metadata: map[string]string{
						entityCommodity:   p.Commodity,
						"defaultCurrency": config.DefaultCurrency(),
						metaDate:          p.Date.Format("2006-01-02"),
					},
				})
			}
		}
	}
	return issues, nil
}

// 4. Journal price consistency: transaction unit price vs quote mismatch.
func checkJournalPriceConsistency(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)
	postings := query.Init(db).Desc().All()

	for i := range postings {
		p := &postings[i]
		if !utils.IsCurrency(p.Commodity) {
			externalPrice := GetUnitPrice(db, p.Commodity, p.Date)
			diff := externalPrice.Value.Sub(p.Price()).Abs()
			if externalPrice.CommodityName == p.Commodity &&
				externalPrice.CommodityType != config.Unknown &&
				!IsSellWithCapitalGains(db, *p) &&
				diff.GreaterThanOrEqual(decimal.NewFromFloat(0.0001)) {
				issues = append(issues, QualityIssue{
					Code:        "journal_price_mismatch",
					Level:       LevelWarning,
					Category:    CategoryValuation,
					Summary:     "Unit Price Mismatch",
					Description: "Unit price used in the journal differs from the price fetched from the external market system.",
					Details:     fmt.Sprintf("The price specified in your posting (%s) doesn't match the price %s (%s) fetched from external system", formatPostingText(*p), externalPrice.Value.StringFixed(4), externalPrice.Date.Format(DateFormat)),
					Entity: &IssueEntity{
						Type:  entityCommodity,
						ID:    p.Commodity,
						Label: p.Commodity,
					},
					AffectedFeatures: []string{FeatureInvestmentPerformance, FeatureCommodities},
					Action: &IssueAction{
						Label: actionEditTransaction,
						Href:  formatEditorURL(*p),
					},
					Metadata: map[string]string{
						entityCommodity: p.Commodity,
						metaDate:        p.Date.Format("2006-01-02"),
						"journalPrice":  p.Price().StringFixed(4),
						"marketPrice":   externalPrice.Value.StringFixed(4),
					},
				})
			}
		}
	}
	return issues, nil
}

// 5. Allocation configuration: asset accounts missing from allocation targets.
func checkAllocationConfiguration(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)
	if len(config.GetConfig().AllocationTargets) == 0 {
		return issues, nil
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
		issues = append(issues, QualityIssue{
			Code:        "allocation_target_missing_account",
			Level:       LevelWarning,
			Category:    CategoryAllocation,
			Summary:     "Asset Accounts Missing from Allocation Targets",
			Description: "One or more asset accounts are not included in any asset allocation target. Their balances are omitted from target allocation tracking.",
			Details:     fmt.Sprintf("The following asset accounts are not part of any asset allocation target: %s", strings.Join(ignoredAccounts, ", ")),
			Entity: &IssueEntity{
				Type:  "account",
				ID:    ignoredAccounts[0],
				Label: ignoredAccounts[0],
			},
			AffectedFeatures: []string{FeatureAllocation},
			Action: &IssueAction{
				Label: "Review Allocation",
				Href:  urlAllocation,
			},
			Metadata: map[string]string{
				"accounts": strings.Join(ignoredAccounts, ", "),
			},
		})
	}

	return issues, nil
}

// 6. Current valuation quality: checks current portfolio valuation used by Net Worth and Scenario Planning.
func checkCurrentValuationQuality(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)

	asOf := utils.Now().In(config.TimeZone())
	dayEnd := time.Date(asOf.Year(), asOf.Month(), asOf.Day()+1, 0, 0, 0, 0, asOf.Location())

	var investments []posting.Posting
	ids := db.Model(&posting.Posting{}).Select("transaction_id").Where("forecast = ? AND date < ?", false, dayEnd).
		Where("account LIKE ? AND account != ? AND account NOT LIKE ?", "Assets:%", "Assets:Checking", "Assets:Checking:%")
	if err := db.Where("forecast = ? AND date < ? AND transaction_id IN (?)", false, dayEnd, ids).Order("date asc, id asc").Find(&investments).Error; err != nil {
		return nil, err
	}

	if len(investments) == 0 {
		return issues, nil
	}

	var allPosts []posting.Posting
	if err := db.Where("forecast = ? AND date < ?", false, dayEnd).Order("date asc, id asc").Find(&allPosts).Error; err != nil {
		return nil, err
	}

	events := classifyInvestmentEvents(investments, allPosts)
	_, quality, quotes := performanceValuation(db, events, dayEnd.Add(-time.Nanosecond))

	seen := make(map[string]bool)
	for _, q := range quotes {
		if q.Source != ValuationSourceMarket && !seen[q.Commodity] {
			seen[q.Commodity] = true
			sourceText := "trade"
			if q.Source == ValuationSourceCost {
				sourceText = ValuationSourceCost
			}
			issues = append(issues, QualityIssue{
				Code:        ReasonValuationFallback,
				Level:       LevelWarning,
				Category:    CategoryValuation,
				Summary:     fmt.Sprintf("%s valuation fallback", q.Commodity),
				Description: fmt.Sprintf("Paisa could not obtain a market quote for %s at the current valuation date and fell back to %s pricing.", q.Commodity, sourceText),
				Details:     fmt.Sprintf("Context: Current portfolio valuation · Commodity: %s · Fallback source: %s", q.Commodity, q.Source),
				Entity: &IssueEntity{
					Type:  entityCommodity,
					ID:    q.Commodity,
					Label: q.Commodity,
				},
				AffectedFeatures: []string{FeatureNetWorth, FeatureScenarios},
				Action: &IssueAction{
					Label: actionReviewPrices,
					Href:  urlPrices,
				},
				Metadata: map[string]string{
					entityCommodity: q.Commodity,
					metaSource:      q.Source,
					"context":       "Current portfolio valuation",
				},
			})
		}
	}
	_ = quality
	return issues, nil
}

// 7. Current FY valuation quality: checks default Investment Performance period opening and closing/as-of boundaries.
func checkCurrentFYValuationQuality(ctx *diagnosisContext) ([]QualityIssue, error) {
	issues := make([]QualityIssue, 0)

	perf, err := ctx.GetCurrentFYPerformance()
	if err != nil {
		// If reconciliation failed or range error, performance check handles it
		if errors.Is(err, ErrPerformanceReconciliation) {
			return issues, nil
		}
		return nil, err
	}

	seen := make(map[string]bool)
	for _, q := range perf.OpeningQuotes {
		if q.Source != ValuationSourceMarket {
			key := q.Commodity + ":opening"
			if !seen[key] {
				seen[key] = true
				issues = append(issues, QualityIssue{
					Code:        ReasonValuationFallback,
					Level:       LevelWarning,
					Category:    CategoryValuation,
					Summary:     fmt.Sprintf("%s valuation fallback (Current FY opening)", q.Commodity),
					Description: fmt.Sprintf("Paisa could not obtain a market quote for %s at Current FY opening (%s) and fell back to %s pricing.", q.Commodity, perf.StartDate, q.Source),
					Details:     fmt.Sprintf("Context: Current FY opening valuation · Date: %s · Commodity: %s · Source: %s", perf.StartDate, q.Commodity, q.Source),
					Entity: &IssueEntity{
						Type:  entityCommodity,
						ID:    q.Commodity,
						Label: q.Commodity,
					},
					AffectedFeatures: []string{FeatureInvestmentPerformance},
					Action: &IssueAction{
						Label: actionReviewPrices,
						Href:  urlPrices,
					},
					Metadata: map[string]string{
						entityCommodity: q.Commodity,
						"boundary":      "opening",
						metaDate:        perf.StartDate,
						metaSource:      q.Source,
					},
				})
			}
		}
	}

	for _, q := range perf.ClosingQuotes {
		if q.Source != ValuationSourceMarket {
			key := q.Commodity + ":closing"
			if !seen[key] {
				seen[key] = true
				issues = append(issues, QualityIssue{
					Code:        ReasonValuationFallback,
					Level:       LevelWarning,
					Category:    CategoryValuation,
					Summary:     fmt.Sprintf("%s valuation fallback (Current FY as-of)", q.Commodity),
					Description: fmt.Sprintf("Paisa could not obtain a market quote for %s at Current FY as-of date (%s) and fell back to %s pricing.", q.Commodity, perf.EndDate, q.Source),
					Details:     fmt.Sprintf("Context: Current FY closing/as-of valuation · Date: %s · Commodity: %s · Source: %s", perf.EndDate, q.Commodity, q.Source),
					Entity: &IssueEntity{
						Type:  entityCommodity,
						ID:    q.Commodity,
						Label: q.Commodity,
					},
					AffectedFeatures: []string{FeatureInvestmentPerformance},
					Action: &IssueAction{
						Label: actionReviewPrices,
						Href:  urlPrices,
					},
					Metadata: map[string]string{
						entityCommodity: q.Commodity,
						"boundary":      "closing",
						metaDate:        perf.EndDate,
						metaSource:      q.Source,
					},
				})
			}
		}
	}

	return issues, nil
}

// 8. Investment attribution: globally unattributed dividend or interest income.
func checkInvestmentIncomeAttribution(ctx *diagnosisContext) ([]QualityIssue, error) {
	issues := make([]QualityIssue, 0)

	perf, err := ctx.GetCurrentFYPerformance()
	if err != nil {
		if errors.Is(err, ErrPerformanceReconciliation) {
			return issues, nil
		}
		return nil, err
	}

	for _, reason := range perf.Quality.Reasons {
		if reason.Code == ReasonUnattributedIncome {
			issues = append(issues, QualityIssue{
				Code:             ReasonUnattributedIncome,
				Level:            LevelWarning,
				Category:         CategoryInvestments,
				Summary:          "Unattributed Investment Income",
				Description:      "Dividend or interest income is not attributed to a specific investment commodity or account. Return calculations cannot accurately attribute this income to the underlying security.",
				Details:          fmt.Sprintf("Investment income on %s is not attributed to an investment commodity or account.", reason.Date),
				AffectedFeatures: []string{FeatureInvestmentPerformance},
				Action: &IssueAction{
					Label: "Review Performance",
					Href:  urlPerformance,
				},
				Metadata: map[string]string{
					metaDate: reason.Date,
				},
			})
		}
	}

	return issues, nil
}

// 9. Performance reconciliation: evaluates portfolio scope for current_fy.
func checkPerformanceReconciliation(ctx *diagnosisContext) ([]QualityIssue, error) {
	issues := make([]QualityIssue, 0)

	_, err := ctx.GetCurrentFYPerformance()
	if err != nil && errors.Is(err, ErrPerformanceReconciliation) {
		issues = append(issues, QualityIssue{
			Code:             "investment_performance_reconciliation_failed",
			Level:            LevelDanger,
			Category:         CategoryInvestments,
			Summary:          "Investment Performance Did Not Reconcile",
			Description:      "The portfolio valuation and performance identity (Closing Value = Opening Value + Net Contributions + Investment Return) failed to reconcile for the current financial year.",
			Details:          "Context: Current financial year · Entire investment portfolio",
			AffectedFeatures: []string{FeatureInvestmentPerformance},
			Action: &IssueAction{
				Label: "Review Performance",
				Href:  urlPerformance,
			},
			Metadata: map[string]string{
				"period": PerformancePresetCurrentFY,
				"scope":  "entire_portfolio",
			},
		})
		return issues, nil
	}
	if err != nil && !errors.Is(err, ErrPerformanceRange) {
		return nil, err
	}

	return issues, nil
}

// 10. Scenario history readiness: checks historical samples via BuildScenarioBaseline.
// - 1-5 months: info (insufficient_*_history)
// - 0 months: warning (insufficient_*_history)
// - first-time investor: info (no_investment_activity), suppresses contribution history issue.
func checkScenarioHistoryReadiness(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)

	var count int64
	if err := db.Model(&posting.Posting{}).Count(&count).Error; err != nil {
		return nil, err
	}
	if count == 0 {
		return issues, nil
	}

	baseline, err := ctx.GetScenarioBaseline()
	if err != nil {
		return nil, err
	}

	// Income history check
	if baseline.MonthlyIncome.SampleCount == 0 {
		issues = append(issues, QualityIssue{
			Code:             "insufficient_income_history",
			Level:            LevelWarning,
			Category:         CategoryHistory,
			Summary:          "No Historical Income Data",
			Description:      "Scenario Planning has zero completed months of income history and cannot calculate a monthly income baseline.",
			Details:          "Scenario Planning requires historical income postings to compute baseline assumptions.",
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: "0",
			},
		})
	} else if baseline.MonthlyIncome.SampleCount < 6 {
		issues = append(issues, QualityIssue{
			Code:             "insufficient_income_history",
			Level:            LevelInfo,
			Category:         CategoryHistory,
			Summary:          "Limited Income History",
			Description:      fmt.Sprintf("Scenario Planning currently uses %d completed months of income history. The baseline is usable but based on less history than usual.", baseline.MonthlyIncome.SampleCount),
			Details:          fmt.Sprintf("Sample count: %d of recommended 6 completed months.", baseline.MonthlyIncome.SampleCount),
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: fmt.Sprintf("%d", baseline.MonthlyIncome.SampleCount),
			},
		})
	}

	// Expense history check
	if baseline.MonthlyExpenses.SampleCount == 0 {
		issues = append(issues, QualityIssue{
			Code:             "insufficient_expense_history",
			Level:            LevelWarning,
			Category:         CategoryHistory,
			Summary:          "No Historical Expense Data",
			Description:      "Scenario Planning has zero completed months of expense history and cannot calculate a monthly expense baseline.",
			Details:          "Scenario Planning requires historical expense postings to compute baseline assumptions.",
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: "0",
			},
		})
	} else if baseline.MonthlyExpenses.SampleCount < 6 {
		issues = append(issues, QualityIssue{
			Code:             "insufficient_expense_history",
			Level:            LevelInfo,
			Category:         CategoryHistory,
			Summary:          "Limited Expense History",
			Description:      fmt.Sprintf("Scenario Planning currently uses %d completed months of expense history. The baseline is usable but based on less history than usual.", baseline.MonthlyExpenses.SampleCount),
			Details:          fmt.Sprintf("Sample count: %d of recommended 6 completed months.", baseline.MonthlyExpenses.SampleCount),
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: fmt.Sprintf("%d", baseline.MonthlyExpenses.SampleCount),
			},
		})
	}

	// Contribution / Investment Transfer check
	switch {
	case baseline.MonthlyInvestmentTransfer.Source == reasonNoInvestmentActivity:
		// First-time investor: emit informational notice, do NOT emit insufficient_contribution_history
		issues = append(issues, QualityIssue{
			Code:             "no_investment_activity",
			Level:            LevelInfo,
			Category:         CategoryHistory,
			Summary:          "No Previous Investment Activity",
			Description:      "Paisa will use ₹0 as your baseline monthly investment transfer for Scenario Planning.",
			Details:          "No investment transactions found. Scenario baseline starts with zero investment holdings and zero monthly transfer.",
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSource: reasonNoInvestmentActivity,
			},
		})
	case baseline.MonthlyInvestmentTransfer.SampleCount == 0:
		issues = append(issues, QualityIssue{
			Code:             "insufficient_contribution_history",
			Level:            LevelWarning,
			Category:         CategoryHistory,
			Summary:          "No Historical Contribution Data",
			Description:      "Scenario Planning has zero completed months of contribution history.",
			Details:          "Scenario Planning requires historical investment contributions to compute baseline transfers.",
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: "0",
			},
		})
	case baseline.MonthlyInvestmentTransfer.SampleCount < 6:
		issues = append(issues, QualityIssue{
			Code:             "insufficient_contribution_history",
			Level:            LevelInfo,
			Category:         CategoryHistory,
			Summary:          "Limited Contribution History",
			Description:      fmt.Sprintf("Scenario Planning currently uses %d completed months of contribution history. The baseline is usable but based on less history than usual.", baseline.MonthlyInvestmentTransfer.SampleCount),
			Details:          fmt.Sprintf("Sample count: %d of recommended 6 completed months.", baseline.MonthlyInvestmentTransfer.SampleCount),
			AffectedFeatures: []string{FeatureScenarios},
			Action: &IssueAction{
				Label: actionReviewScenarios,
				Href:  urlScenarios,
			},
			Metadata: map[string]string{
				metaSamples: fmt.Sprintf("%d", baseline.MonthlyInvestmentTransfer.SampleCount),
			},
		})
	}

	return issues, nil
}

// 11. Scenario checking readiness: checks Assets:Checking availability.
func checkScenarioCheckingReadiness(ctx *diagnosisContext) ([]QualityIssue, error) {
	db := ctx.db
	issues := make([]QualityIssue, 0)

	var count int64
	if err := db.Model(&posting.Posting{}).Count(&count).Error; err != nil {
		return nil, err
	}
	if count == 0 {
		return issues, nil
	}

	baseline, err := ctx.GetScenarioBaseline()
	if err != nil {
		return nil, err
	}

	for _, reason := range baseline.Quality.Reasons {
		if reason.Code == "no_checking_account" {
			issues = append(issues, QualityIssue{
				Code:        "no_checking_account",
				Level:       LevelWarning,
				Category:    CategoryConfiguration,
				Summary:     "No Checking Account Found",
				Description: "Scenario Planning requires an Assets:Checking account (or sub-accounts) to determine your liquid cash baseline.",
				Details:     "Assets:Checking is not defined or has no recorded transactions.",
				Entity: &IssueEntity{
					Type:  entityAccount,
					ID:    accountAssetsChecking,
					Label: accountAssetsChecking,
				},
				AffectedFeatures: []string{FeatureScenarios},
				Action: &IssueAction{
					Label: "Review Accounts",
					Href:  urlConfig,
				},
				Metadata: map[string]string{
					entityAccount: accountAssetsChecking,
				},
			})
		}
	}

	return issues, nil
}
