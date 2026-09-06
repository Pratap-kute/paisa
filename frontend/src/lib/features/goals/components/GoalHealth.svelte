<script lang="ts">
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  analyzeGoal,
  type GoalIntelligence,
  goalStatusLabel,
} from "$lib/domain/goal_intelligence";
import {
  formatCurrency,
  formatCurrencyCrude,
  formatFloat,
} from "$lib/shared/formatters/currency";
import { obscure } from "$lib/shared/state/persisted";

let { goal, compact = false }: { goal: GoalSummary; compact?: boolean } =
  $props();
const health = $derived(analyzeGoal(goal));
const money = (value: number) => formatCurrency($obscure ? 0 : value);
const compactMoney = (value: number) =>
  formatCurrencyCrude($obscure ? 0 : value);

function statusClass(analysis: GoalIntelligence): string {
  if (analysis.attention === "critical") return "text-negative";
  if (analysis.attention === "warning") return "text-warning";
  if (
    analysis.scheduleStatus === "on-track" ||
    analysis.state === "completed"
  ) {
    return "text-positive";
  }
  return "text-muted-foreground";
}

function statusIcon(analysis: GoalIntelligence): string {
  if (analysis.attention === "critical") return "fas fa-circle-exclamation";
  if (analysis.attention === "warning") return "fas fa-triangle-exclamation";
  if (
    analysis.scheduleStatus === "on-track" ||
    analysis.state === "completed"
  ) {
    return "fas fa-check-circle";
  }
  return "";
}
</script>

<div class="min-w-0 space-y-1.5 text-sm">
  <p class="font-medium {statusClass(health)} inline-flex items-center gap-1.5">
    {#if statusIcon(health)}
      <i class="{statusIcon(health)} text-xs" aria-hidden="true"></i>
    {/if}
    <span>{goalStatusLabel(goal, health)}</span>
  </p>

  {#if goal.type === "retirement"}
    {#if health.validTarget}
      <p class="text-muted-foreground">
        {compact ? compactMoney(health.remainingAmount) : money(health.remainingAmount)} remaining
      </p>
    {/if}
    {#if goal.swr !== undefined}
      <p class="text-muted-foreground">
        {formatFloat(goal.swr)}% SWR
        {#if !compact && goal.yearlyExpense !== undefined}
          · {money(goal.yearlyExpense)} yearly expenses
        {/if}
      </p>
      {#if goal.yearlyExpenseSource}
        <p class="text-muted-foreground text-xs">
          {goal.yearlyExpenseSource === "configured"
            ? "Using configured yearly expenses"
            : "Based on historical expenses"}
        </p>
      {/if}
    {/if}
  {:else if health.state !== "completed"}
    {#if health.requiredMonthlyContribution !== undefined}
      <div class="flex justify-between text-muted-foreground">
        <span>Required</span>
        <span class="font-medium text-foreground tabular-nums">
          {compact
            ? `${compactMoney(health.requiredMonthlyContribution)}/mo`
            : `Required ${money(health.requiredMonthlyContribution)}/month`}
        </span>
      </div>
    {/if}
    {#if health.actualMonthlyContribution !== undefined}
      <div class="flex justify-between text-muted-foreground">
        <span>Recent pace</span>
        <span class="font-medium text-foreground tabular-nums">
          {compact
            ? `${compactMoney(health.actualMonthlyContribution)}/mo`
            : `Recent pace ${money(health.actualMonthlyContribution)}/month`}
        </span>
      </div>
    {/if}
    {#if health.state === "overdue"}
      <div class="flex justify-between text-muted-foreground">
        <span>Remaining</span>
        <span class="font-medium text-foreground tabular-nums">
          {compact
            ? compactMoney(health.remainingAmount)
            : `${money(health.remainingAmount)} remaining`}
        </span>
      </div>
    {/if}
    {#if health.projectedCompletionDate}
      <div class="flex justify-between text-muted-foreground">
        <span>Projected</span>
        <span class="font-medium text-foreground">
          ~{health.projectedCompletionDate.format("MMM YYYY")}
        </span>
      </div>
      {#if health.projectionSource === "configured-payment"}
        <p class="text-muted-foreground text-xs">
          At {compact ? `${compactMoney(goal.paymentPerPeriod ?? 0)}/mo` : `${money(goal.paymentPerPeriod ?? 0)}/month`} configured payment
        </p>
      {:else if !compact}
        <p class="text-muted-foreground text-xs">
          {health.projectionSource === "recent-pace"
            ? "At recent contribution pace"
            : "From assumed growth"}
        </p>
      {/if}
      {#if health.delayMonths}
        <p class="text-warning text-xs">
          Approximately {health.delayMonths} months later than planned
        </p>
      {/if}
    {/if}
    {#if health.assumptions.annualReturn !== undefined}
      <p class="text-muted-foreground text-xs">
        Assuming {formatFloat(health.assumptions.annualReturn, 0)}% annual return
      </p>
    {/if}
    {#if !compact}
      {#each health.reasons.filter((reason) => reason !== goalStatusLabel(goal, health)) as reason}
        <p class="text-muted-foreground text-xs">{reason}</p>
      {/each}
    {/if}
  {/if}
</div>
