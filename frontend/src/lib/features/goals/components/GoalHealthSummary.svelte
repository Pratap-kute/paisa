<script lang="ts">
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  goalStatusLabel,
  summarizeGoalHealth,
} from "$lib/domain/goal_intelligence";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { obscure } from "$lib/shared/state/persisted";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
let { goals }: { goals: GoalSummary[] } = $props();
const health = $derived(summarizeGoalHealth(goals));
const money = (value: number) => formatCurrency($obscure ? 0 : value);
</script>

{#if goals.length}
  <Section title="Goal Health Summary">
  <MetricStrip cols={4}>
    <Metric label="Active goals" value={String(health.active)} />
    <Metric label="Goals on track" value={String(health.onTrack)} />
    <Metric label="Need attention" value={String(health.attention.length)} />
    <Metric label="Monthly contribution required"
      value={health.requiredMonthlyContribution === undefined ? "Unavailable" : money(health.requiredMonthlyContribution)}
      secondary="Active dated Savings goals · planning estimate" />
  </MetricStrip>
</Section>
  {#if health.attention.length}
    <Section title="Needs Attention">
  <ul class="divide-y divide-border-subtle">
        {#each health.attention as { goal, analysis } (goal.id)}
          <li class="py-3 min-w-0">
            <a class="text-primary break-words" href={`/more/goals/savings/${encodeURIComponent(goal.name)}`}>{goal.name}</a>
            <p class="text-sm text-warning">{goalStatusLabel(goal, analysis)}</p>
            <p class="text-sm text-muted-foreground">
              {#if analysis.state === "overdue"}{money(analysis.remainingAmount)} remaining
              {:else}Recent pace {money(analysis.actualMonthlyContribution ?? 0)}/month · Required {money(analysis.requiredMonthlyContribution ?? 0)}/month{/if}
            </p>
          </li>
        {/each}
      </ul>
</Section>
  {/if}
{/if}
