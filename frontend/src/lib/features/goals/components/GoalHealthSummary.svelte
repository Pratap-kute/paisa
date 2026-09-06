<script lang="ts">
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  goalStatusLabel,
  summarizeGoalHealth,
} from "$lib/domain/goal_intelligence";
import { formatCurrencyCrude } from "$lib/shared/formatters/currency";
import { obscure } from "$lib/shared/state/persisted";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";

let { goals }: { goals: GoalSummary[] } = $props();
const health = $derived(summarizeGoalHealth(goals));
const compactMoney = (value: number) =>
  formatCurrencyCrude($obscure ? 0 : value);
</script>

{#if goals.length}
  <Section title="Goal Health Summary">
  <MetricStrip cols={4}>
    <Metric label="Active" value={String(health.active)} />
    <Metric label="On track" value={String(health.onTrack)} />
    <Metric label="Attention" value={String(health.attention.length)} />
    <Metric
      label="Required / month"
      value={health.requiredMonthlyContribution === undefined
          ? "Unavailable"
          : compactMoney(health.requiredMonthlyContribution)}
      secondary="Planning estimate"
    />
  </MetricStrip>
</Section>

  {#if health.attention.length}
    <Section title="Needs Attention">
  <ul class="divide-y divide-border-subtle">
        {#each health.attention as { goal, analysis } (goal.id)}
          <li class="py-3 min-w-0">
            <a
              class="text-primary font-medium break-words hover:underline"
              href={`/more/goals/savings/${encodeURIComponent(goal.name)}`}
            >
              {goal.name}
            </a>
            <p class="text-sm {analysis.attention === 'critical' ? 'text-negative' : 'text-warning'} font-medium">
              {goalStatusLabel(goal, analysis)}
            </p>
            <p class="text-sm text-muted-foreground">
              {#if analysis.state === "overdue"}
                {compactMoney(analysis.remainingAmount)} remaining
              {:else}
                Recent pace {compactMoney(analysis.actualMonthlyContribution ?? 0)}/mo · Required {compactMoney(analysis.requiredMonthlyContribution ?? 0)}/mo
              {/if}
            </p>
          </li>
        {/each}
      </ul>
</Section>
  {/if}
{/if}
