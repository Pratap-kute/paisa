<script lang="ts">
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  analyzeGoal,
  goalStatusLabel,
  goalStatusShortLabel,
} from "$lib/domain/goal_intelligence";
import {
  formatCurrency,
  formatFloat,
  formatPercentage,
} from "$lib/shared/formatters/currency";
import { obscure } from "$lib/shared/state/persisted";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
let { goal, xirr, investmentTotal, gainTotal }: {
  goal: GoalSummary;
  xirr: number;
  investmentTotal: number;
  gainTotal: number;
} = $props();
const health = $derived(analyzeGoal(goal));
const money = (value: number | undefined) =>
  value === undefined ? "Unavailable" : formatCurrency($obscure ? 0 : value);
</script>

<Section title="Plan">
  <MetricStrip cols={4}>
    <Metric label="Target Amount" value={money(goal.target)} />
    <Metric label="Target date" value={health.targetDate?.format("DD MMM YYYY") ?? "No deadline configured"} secondary={health.configuredCompletionDate ? `Configured payment projection ~${health.configuredCompletionDate.format("MMM YYYY")}` : undefined} />
    <Metric label="Required contribution" value={money(health.requiredMonthlyContribution)} secondary="Per month" />
    <Metric label="Expected return assumption" value={health.assumptions.annualReturn === undefined ? "Unavailable" : `${formatFloat(health.assumptions.annualReturn)}%`} secondary={health.assumptions.annualReturn === undefined ? undefined : `Assuming ${formatFloat(health.assumptions.annualReturn)}% annual return`} />
  </MetricStrip>
  {#if (goal.paymentPerPeriod ?? 0) > 0}<p class="text-sm text-muted-foreground">Configured monthly payment: {money(goal.paymentPerPeriod)}/month</p>{/if}
</Section>
<Section title="Actual">
  <MetricStrip cols={4}>
    <Metric label="Current Savings" value={money(goal.current)}
      secondary={`${formatPercentage($obscure ? 0 : health.progressRatio, 2)} complete`} />
    <Metric label="Recent contribution pace"
      value={money(health.actualMonthlyContribution)}
      secondary={`Per month · ${health.contributionMonthsObserved} completed months observed`} />
    <Metric label="Historical XIRR" value={`${formatFloat(xirr)}%`} />
    <Metric label="Net Investment" value={money(investmentTotal)}
      secondary={`${money(gainTotal)} ${gainTotal >= 0 ? "gain" : "loss"}`} />
  </MetricStrip>
</Section>
<Section title="Outlook">
  <MetricStrip cols={4}>
    <Metric label="Schedule" value={goalStatusShortLabel(goal, health)} secondary={goalStatusShortLabel(goal, health) !== goalStatusLabel(goal, health) ? goalStatusLabel(goal, health) : undefined} status={health.attention === "none" ? "neutral" : "warning"} />
    <Metric label="Projected Completion" value={health.state === "completed" ? "Goal reached" : health.projectedCompletionDate ? `~${health.projectedCompletionDate.format("MMM YYYY")}` : "Not projected"} secondary={health.projectedCompletionDate ? health.projectionSource === "recent-pace" ? "At recent contribution pace" : health.projectionSource === "assumed-growth" ? "From assumed growth" : "At configured monthly payment" : undefined} />
    <Metric label="Monthly gap" value={health.state === "completed" ? money(0) : money(health.paceGap)} />
    <Metric label="Remaining Amount" value={health.validTarget ? money(health.remainingAmount) : "Unavailable"} />
  </MetricStrip>
  {#if health.delayMonths}<p class="text-sm text-warning">Approximately {health.delayMonths} months later than planned</p>{/if}
  {#each health.reasons as reason}<p class="text-sm text-muted-foreground">{reason}</p>{/each}
</Section>
