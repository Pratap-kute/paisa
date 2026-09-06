<script lang="ts">
import type { GoalSummary } from "$lib/domain/goals_models";
import { analyzeGoal, goalStatusLabel } from "$lib/domain/goal_intelligence";
import { formatCurrency, formatFloat } from "$lib/shared/formatters/currency";
import { obscure } from "$lib/shared/state/persisted";

let { goal, compact = false }: { goal: GoalSummary; compact?: boolean } =
  $props();
const health = $derived(analyzeGoal(goal));
const money = (value: number) => formatCurrency($obscure ? 0 : value);
</script>

<div class="mt-3 min-w-0 space-y-1 text-sm">
  <p class={health.attention !== "none" ? "text-warning" : "text-muted-foreground"}>{goalStatusLabel(goal, health)}</p>
  {#if goal.type === "retirement"}
    {#if health.validTarget}<p>{money(health.remainingAmount)} remaining</p>{/if}
    {#if !compact && goal.yearlyExpense !== undefined && goal.swr !== undefined}
      <p class="text-muted-foreground">{money(goal.yearlyExpense)} yearly expenses · {formatFloat(goal.swr)}% SWR</p>
      {#if goal.yearlyExpenseSource}<p class="text-muted-foreground">{goal.yearlyExpenseSource === "configured" ? "Using configured yearly expenses" : "Based on historical yearly expenses"}</p>{/if}
    {/if}
  {:else if health.state !== "completed"}
    {#if health.requiredMonthlyContribution !== undefined}<p>Required {money(health.requiredMonthlyContribution)}/month</p>{/if}
    {#if !compact && health.actualMonthlyContribution !== undefined}<p>Recent pace {money(health.actualMonthlyContribution)}/month</p>{/if}
    {#if health.state === "overdue"}<p>{money(health.remainingAmount)} remaining</p>{/if}
    {#if !compact && health.projectedCompletionDate}
      <p>Projected ~{health.projectedCompletionDate.format("MMM YYYY")}</p>
      <p class="text-muted-foreground">{health.projectionSource === "recent-pace" ? "At recent contribution pace" : health.projectionSource === "assumed-growth" ? "From assumed growth" : `At ${money(goal.paymentPerPeriod ?? 0)}/month configured payment`}</p>
      {#if health.delayMonths}<p>Approximately {health.delayMonths} months later than planned</p>{/if}
    {/if}
    {#if !compact && health.assumptions.annualReturn !== undefined}<p class="text-muted-foreground">Assuming {formatFloat(health.assumptions.annualReturn)}% annual return</p>{/if}
    {#each health.reasons.filter((reason) => reason !== goalStatusLabel(goal, health)) as reason}<p class="text-muted-foreground">{reason}</p>{/each}
  {/if}
</div>
