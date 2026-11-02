package service

import (
	"math"
	"sort"
	"time"
)

// Goal policy. Coverage is the ratio of the recent monthly contribution to the
// contribution required to reach the target by its deadline.
const (
	goalHistoryMonths           = 6
	goalMinimumObservedMonths   = 3
	goalOnTrackCoverage         = 0.95
	goalBehindCoverage          = 0.75
	goalMaximumProjectionMonths = 1200
)

const goalDateLayout = "2006-01-02"

const goalStateOverdue = "overdue"

type GoalContribution struct {
	Month  string
	Amount float64
}

type GoalInput struct {
	Type             string // "savings" or "retirement"
	Current          float64
	Target           float64
	TargetDate       string // YYYY-MM-DD, empty when there is no deadline
	Rate             float64
	PaymentPerPeriod float64
	// Contribution history is only read for savings goals.
	ContributionHistory []GoalContribution
}

// GoalIntelligence is the analysis of one goal as of a date. Optional values
// are nil when they cannot be computed. Dates are formatted YYYY-MM-DD.
type GoalIntelligence struct {
	ProgressRatio               float64
	RemainingAmount             float64
	ValidTarget                 bool
	RequiredMonthlyContribution *float64
	ActualMonthlyContribution   *float64
	ContributionMonthsObserved  int
	ActiveContributionMonths    int
	PaceCoverage                *float64
	PaceGap                     *float64
	ProjectedCompletionDate     *string
	ConfiguredCompletionDate    *string
	ProjectionSource            string
	DelayMonths                 *int
	State                       string // active, completed, overdue
	ScheduleStatus              string // on-track, behind, at-risk, insufficient-data, no-deadline
	Attention                   string // none, warning, critical
	DeadlineSource              string // configured, derived-from-payment, none
	TargetDate                  *string
	AnnualReturn                *float64
	Reasons                     []string
}

func finite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func startOfMonth(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
}

func parseGoalDate(value string, loc *time.Location) *time.Time {
	if value == "" {
		return nil
	}
	date, err := time.ParseInLocation(goalDateLayout, value, loc)
	if err != nil {
		return nil
	}
	return &date
}

func formatGoalDate(t time.Time) *string {
	s := t.Format(goalDateLayout)
	return &s
}

func floatPtr(v float64) *float64 { return &v }

// goalPMT and goalNPER use the beginning-of-month payment convention.
func goalPMT(rate float64, nper int, pv, fv float64) float64 {
	if nper == 0 {
		return 0
	}
	if rate == 0 {
		return -(pv + fv) / float64(nper)
	}
	factor := math.Pow(1+rate, float64(nper))
	annuity := (1 + rate) * ((factor - 1) / rate)
	return -(fv + pv*factor) / annuity
}

func goalNPER(rate, pmt, pv, fv float64) float64 {
	if rate == 0 {
		if pmt != 0 {
			return -(pv + fv) / pmt
		}
		return 0
	}
	k := (pmt * (1 + rate)) / rate
	num := k - fv
	den := pv + k
	if den == 0 || num/den <= 0 {
		return math.NaN()
	}
	return math.Log(num/den) / math.Log(1+rate)
}

func calculateGoalProgress(current, target float64) (validTarget bool, ratio, remaining float64) {
	valid := finite(target) && target > 0 && finite(current)
	if valid {
		ratio = current / target
		remaining = math.Max(target-current, 0)
	}
	validTarget = valid && finite(ratio) && finite(remaining)
	if !finite(ratio) {
		ratio = 0
	}
	if !finite(remaining) {
		remaining = 0
	}
	return validTarget, ratio, remaining
}

type contributionPace struct {
	observed, active int
	average          *float64
}

// goalContributionPace averages the contribution of the last six complete
// months. The backend supplies zero months after activity begins, so a month
// that is missing is not treated as observed zero activity.
func goalContributionPace(history []GoalContribution, asOf time.Time) contributionPace {
	end := startOfMonth(asOf)
	start := end.AddDate(0, -goalHistoryMonths, 0)
	months := map[string]GoalContribution{}
	for _, item := range history {
		month := parseGoalDate(item.Month+"-01", asOf.Location())
		if month != nil && !month.Before(start) && month.Before(end) && finite(item.Amount) {
			months[item.Month] = item
		}
	}
	series := make([]GoalContribution, 0, len(months))
	for _, item := range months {
		series = append(series, item)
	}
	sort.Slice(series, func(i, j int) bool { return series[i].Month < series[j].Month })

	pace := contributionPace{observed: len(series)}
	if len(series) == 0 {
		return pace
	}
	sum := 0.0
	for _, item := range series {
		sum += item.Amount / float64(len(series))
		if item.Amount > 0 {
			pace.active++
		}
	}
	if finite(sum) {
		pace.average = &sum
	}
	return pace
}

// requiredContribution is the monthly payment that reaches target by deadline.
func requiredContribution(current, target, annualRate float64, deadline, asOf time.Time) *float64 {
	if deadline.Before(startOfDay(asOf)) {
		return nil
	}
	start := startOfMonth(asOf)
	months := (deadline.Year()-start.Year())*12 + int(deadline.Month()) - int(start.Month())
	// A deadline this month still requires the remaining payment this month.
	months = max(1, months)
	value := goalPMT(annualRate/1200, months, current, -target)
	if !finite(value) {
		return nil
	}
	return floatPtr(math.Max(0, value))
}

func projectedCompletion(current, target, annualRate, payment float64, asOf time.Time) *time.Time {
	if current >= target {
		day := startOfDay(asOf)
		return &day
	}
	if payment == 0 && annualRate == 0 {
		return nil
	}
	months := goalNPER(annualRate/1200, payment, current, -target)
	if !finite(months) || months <= 0 || months > goalMaximumProjectionMonths {
		return nil
	}
	date := startOfMonth(asOf).AddDate(0, int(math.Ceil(months)), 0)
	return &date
}

func classifyGoalSchedule(coverage float64) string {
	switch {
	case !finite(coverage):
		return "insufficient-data"
	case coverage >= goalOnTrackCoverage:
		return "on-track"
	case coverage >= goalBehindCoverage:
		return "behind"
	default:
		return "at-risk"
	}
}

// AnalyzeGoal evaluates a goal: progress, the contribution needed to meet its
// deadline, how the recent pace compares, and when it is projected to finish.
// Projections use the configured return, never the observed XIRR.
func AnalyzeGoal(in GoalInput, asOf time.Time) GoalIntelligence {
	asOf = startOfDay(asOf)
	validTarget, ratio, remaining := calculateGoalProgress(in.Current, in.Target)
	retirement := in.Type == "retirement"

	var deadline *time.Time
	if !retirement {
		deadline = parseGoalDate(in.TargetDate, asOf.Location())
	}
	history := in.ContributionHistory
	if retirement {
		history = nil
	}
	pace := goalContributionPace(history, asOf)

	result := GoalIntelligence{
		ProgressRatio:              ratio,
		RemainingAmount:            remaining,
		ValidTarget:                validTarget,
		ContributionMonthsObserved: pace.observed,
		ActiveContributionMonths:   pace.active,
		ActualMonthlyContribution:  pace.average,
		State:                      "active",
		ScheduleStatus:             "no-deadline",
		Attention:                  "none",
		DeadlineSource:             "none",
		Reasons:                    []string{},
	}
	if validTarget && in.Current >= in.Target {
		result.State = "completed"
	}
	if deadline != nil {
		result.ScheduleStatus = "insufficient-data"
		result.DeadlineSource = "configured"
		result.TargetDate = formatGoalDate(*deadline)
	} else if !retirement && in.PaymentPerPeriod > 0 {
		result.DeadlineSource = "derived-from-payment"
	}
	if !validTarget {
		result.Reasons = append(result.Reasons, "A valid positive target and current balance are needed")
	}
	if retirement || !validTarget {
		return result
	}

	rate := in.Rate
	validRate := finite(rate) && rate > -100 && rate <= 100
	if validRate {
		result.AnnualReturn = floatPtr(rate)
	}
	if result.State == "completed" {
		return result
	}
	if deadline != nil && deadline.Before(asOf) {
		result.State = goalStateOverdue
		result.Attention = "critical"
		result.Reasons = append(result.Reasons, "Target date has passed")
	}
	if !validRate {
		result.Reasons = append(result.Reasons, "Expected annual return must be greater than -100% and at most 100%")
		return result
	}

	if deadline == nil && finite(in.PaymentPerPeriod) && in.PaymentPerPeriod > 0 {
		if date := projectedCompletion(in.Current, in.Target, rate, in.PaymentPerPeriod, asOf); date != nil {
			result.ConfiguredCompletionDate = formatGoalDate(*date)
		}
	}
	if deadline != nil && result.State != goalStateOverdue {
		result.RequiredMonthlyContribution = requiredContribution(in.Current, in.Target, rate, *deadline, asOf)
	}

	actual := result.ActualMonthlyContribution
	required := result.RequiredMonthlyContribution
	applyPaceGap(&result, actual, required)

	reliable := result.ContributionMonthsObserved >= goalMinimumObservedMonths
	applyScheduleStatus(&result, deadline, required, reliable)
	applyProjection(&result, in, deadline, rate, asOf, reliable)
	return result
}

// applyPaceGap records how far the recent pace falls short of the required one.
func applyPaceGap(result *GoalIntelligence, actual, required *float64) {
	if actual == nil || required == nil {
		return
	}
	if gap := math.Max(*required-*actual, 0); finite(gap) {
		result.PaceGap = floatPtr(gap)
	}
	if *required > 0 && finite(*actual / *required) {
		result.PaceCoverage = floatPtr(*actual / *required)
	}
}

// applyScheduleStatus classifies a goal with a deadline against its recent pace.
func applyScheduleStatus(result *GoalIntelligence, deadline *time.Time, required *float64, reliable bool) {
	if deadline == nil || result.State == goalStateOverdue {
		return
	}
	switch {
	case required != nil && *required == 0:
		result.ScheduleStatus = "on-track"
	case reliable && result.PaceCoverage != nil:
		result.ScheduleStatus = classifyGoalSchedule(*result.PaceCoverage)
	default:
		result.Reasons = append(result.Reasons, "More contribution history needed")
	}
	switch result.ScheduleStatus {
	case "at-risk":
		result.Attention = "critical"
	case "behind":
		result.Attention = "warning"
	}
}

// applyProjection projects the completion date and how far it is past the deadline.
func applyProjection(result *GoalIntelligence, in GoalInput, deadline *time.Time, rate float64, asOf time.Time, reliable bool) {
	actual := result.ActualMonthlyContribution
	required := result.RequiredMonthlyContribution

	// A short lump sum cannot create a confident actual-pace projection. Without
	// a deadline, the configured payment can still supply a clearly labelled plan.
	var payment *float64
	switch {
	case reliable:
		payment = actual
	case deadline == nil && in.PaymentPerPeriod != 0:
		payment = floatPtr(in.PaymentPerPeriod)
	}
	if payment != nil && finite(*payment) {
		if date := projectedCompletion(in.Current, in.Target, rate, *payment, asOf); date != nil {
			result.ProjectedCompletionDate = formatGoalDate(*date)
		}
		if reliable {
			result.ProjectionSource = "recent-pace"
		} else {
			result.ProjectionSource = "configured-payment"
		}
	} else if required != nil && *required == 0 {
		if date := projectedCompletion(in.Current, in.Target, rate, 0, asOf); date != nil {
			result.ProjectedCompletionDate = formatGoalDate(*date)
		}
		result.ProjectionSource = "assumed-growth"
	}

	if deadline != nil && result.ProjectedCompletionDate != nil {
		projected := parseGoalDate(*result.ProjectedCompletionDate, asOf.Location())
		delay := (projected.Year()-deadline.Year())*12 + int(projected.Month()) - int(deadline.Month())
		result.DelayMonths = new(int)
		*result.DelayMonths = max(0, delay)
	}
}
