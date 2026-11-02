import type {
  GoalIntelligenceData,
  GoalSummary,
} from "#lib/domain/goals_models";

// Goal analysis as the backend returns it for a goal of 6,00,000 on 5 Sep 2026
// (target date 31 Mar 2027 unless stated). Generated from the Go analysis in
// backend/pkg/service/goal_intelligence.go, so the frontend tests render real
// backend output instead of re-implementing the analysis.
export const goalIntelligence = {
  "atRisk": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "requiredMonthlyContribution": 60000,
    "actualMonthlyContribution": 10000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "paceCoverage": 0.16666666666666666,
    "paceGap": 50000,
    "projectedCompletionDate": "2029-09-01",
    "projectionSource": "recent-pace",
    "delayMonths": 30,
    "state": "active",
    "scheduleStatus": "at-risk",
    "attention": "critical",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": []
  },
  "behind": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "requiredMonthlyContribution": 60000,
    "actualMonthlyContribution": 48000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "paceCoverage": 0.8,
    "paceGap": 12000,
    "projectedCompletionDate": "2027-05-01",
    "projectionSource": "recent-pace",
    "delayMonths": 2,
    "state": "active",
    "scheduleStatus": "behind",
    "attention": "warning",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": []
  },
  "completed": {
    "progressRatio": 1.2,
    "remainingAmount": 0,
    "validTarget": true,
    "actualMonthlyContribution": 60000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "state": "completed",
    "scheduleStatus": "insufficient-data",
    "attention": "none",
    "deadlineSource": "configured",
    "targetDate": "2020-01-01",
    "annualReturn": 0,
    "reasons": []
  },
  "completedExact": {
    "progressRatio": 1,
    "remainingAmount": 0,
    "validTarget": true,
    "actualMonthlyContribution": 60000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "state": "completed",
    "scheduleStatus": "insufficient-data",
    "attention": "none",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": []
  },
  "noDeadlineNoPay": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "contributionMonthsObserved": 0,
    "activeContributionMonths": 0,
    "state": "active",
    "scheduleStatus": "no-deadline",
    "attention": "none",
    "deadlineSource": "none",
    "annualReturn": 0,
    "reasons": []
  },
  "noDeadlinePayment": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "contributionMonthsObserved": 0,
    "activeContributionMonths": 0,
    "projectedCompletionDate": "2028-09-01",
    "configuredCompletionDate": "2028-09-01",
    "projectionSource": "configured-payment",
    "state": "active",
    "scheduleStatus": "no-deadline",
    "attention": "none",
    "deadlineSource": "derived-from-payment",
    "annualReturn": 0,
    "reasons": []
  },
  "noHistory": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "requiredMonthlyContribution": 60000,
    "contributionMonthsObserved": 0,
    "activeContributionMonths": 0,
    "state": "active",
    "scheduleStatus": "insufficient-data",
    "attention": "none",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": [
      "More contribution history needed"
    ]
  },
  "onTrack": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "requiredMonthlyContribution": 60000,
    "actualMonthlyContribution": 60000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "paceCoverage": 1,
    "paceGap": 0,
    "projectedCompletionDate": "2027-03-01",
    "projectionSource": "recent-pace",
    "delayMonths": 0,
    "state": "active",
    "scheduleStatus": "on-track",
    "attention": "none",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": []
  },
  "overdue": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "actualMonthlyContribution": 60000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "projectedCompletionDate": "2027-03-01",
    "projectionSource": "recent-pace",
    "delayMonths": 6,
    "state": "overdue",
    "scheduleStatus": "insufficient-data",
    "attention": "critical",
    "deadlineSource": "configured",
    "targetDate": "2026-09-04",
    "annualReturn": 0,
    "reasons": [
      "Target date has passed"
    ]
  },
  "overdueLong": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "actualMonthlyContribution": 60000,
    "contributionMonthsObserved": 3,
    "activeContributionMonths": 3,
    "projectedCompletionDate": "2027-03-01",
    "projectionSource": "recent-pace",
    "delayMonths": 86,
    "state": "overdue",
    "scheduleStatus": "insufficient-data",
    "attention": "critical",
    "deadlineSource": "configured",
    "targetDate": "2020-01-01",
    "annualReturn": 0,
    "reasons": [
      "Target date has passed"
    ]
  },
  "retirementActive": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "contributionMonthsObserved": 0,
    "activeContributionMonths": 0,
    "state": "active",
    "scheduleStatus": "no-deadline",
    "attention": "none",
    "deadlineSource": "none",
    "reasons": []
  },
  "retirementFunded": {
    "progressRatio": 1,
    "remainingAmount": 0,
    "validTarget": true,
    "contributionMonthsObserved": 0,
    "activeContributionMonths": 0,
    "state": "completed",
    "scheduleStatus": "no-deadline",
    "attention": "none",
    "deadlineSource": "none",
    "reasons": []
  },
  "shortHistory": {
    "progressRatio": 0.4,
    "remainingAmount": 360000,
    "validTarget": true,
    "requiredMonthlyContribution": 60000,
    "actualMonthlyContribution": 900000,
    "contributionMonthsObserved": 1,
    "activeContributionMonths": 1,
    "paceCoverage": 15,
    "paceGap": 0,
    "state": "active",
    "scheduleStatus": "insufficient-data",
    "attention": "none",
    "deadlineSource": "configured",
    "targetDate": "2027-03-31",
    "annualReturn": 0,
    "reasons": [
      "More contribution history needed"
    ]
  }
} as const satisfies Record<
  string,
  GoalIntelligenceData
>;

export type GoalScenario = keyof typeof goalIntelligence;

export function goal(
  scenario: GoalScenario = "onTrack",
  overrides: Partial<GoalSummary> = {},
): GoalSummary {
  return {
    type: "savings",
    id: "House",
    name: "House",
    icon: "",
    current: 240000,
    target: 600000,
    targetDate: "2027-03-31",
    rate: 0,
    priority: 1,
    intelligence: structuredClone(goalIntelligence[scenario]) as GoalIntelligenceData,
    ...overrides,
  };
}
