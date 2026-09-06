<script lang="ts">
import Card from "$lib/shared/ui/Card.svelte";
import {
  formatCurrencyCrude,
  formatPercentage,
} from "$lib/shared/formatters/currency";
import type { GoalSummary } from "$lib/domain/goals_models";
import { iconGlyph } from "$lib/shared/ui/icon";
import Metric from "$lib/shared/layout/Metric.svelte";
import Progress from "$lib/shared/ui/Progress.svelte";
import type { Action } from "svelte/action";
import { analyzeGoal } from "$lib/domain/goal_intelligence";
import GoalHealth from "./GoalHealth.svelte";
import { obscure } from "$lib/shared/state/persisted";

interface Props {
  goal: GoalSummary;
  small?: boolean;
  action?: Action;
}

let { goal, small = false, action = null }: Props = $props();

let health = $derived(analyzeGoal(goal));
let completed = $derived(
  Math.max(0, Math.min(100, health.progressRatio * 100)),
);

let progressLabel = $derived.by(() => {
  if ($obscure) {
    return `0.0% ${goal.type === "retirement" ? "funded" : "complete"}`;
  }
  if (health.progressRatio >= 1 || health.state === "completed") {
    return goal.type === "retirement" ? "100%+ funded" : "Target funded";
  }
  const pct = formatPercentage(health.progressRatio, 1);
  return `${pct} ${goal.type === "retirement" ? "funded" : "complete"}`;
});

let targetDateText = $derived(
  health.targetDate ? `Target ${health.targetDate.format("MMM YYYY")}` : "",
);
</script>

<Card padding="md"
  class="{small ? 'mb-3' : 'h-full'} flex flex-col justify-between group">
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center min-w-0">
        {#if action}
          <span
            use:action
            role="button"
            aria-label={`Reorder ${goal.name} goal`}
            tabindex="0"
            class="mr-2 text-base text-muted-foreground opacity-40 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded transition-opacity paisa-clickable shrink-0"
          >
            <i class="fas fa-grip-vertical" aria-hidden="true"></i>
          </span>
        {/if}
        <a
          class="secondary-link min-w-0"
          href="/more/goals/{goal.type}/{encodeURIComponent(goal.name)}"
        >
          <h4 class="text-lg font-semibold text-foreground truncate">{goal.name}</h4>
        </a>
      </div>
      {#if goal.icon}
        <span
          class="{small ? 'text-2xl' : 'text-3xl'} custom-icon inline-flex items-center shrink-0 ml-2"
          >{iconGlyph(goal.icon)}</span
        >
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-3 mb-3">
      <Metric
        label="Current"
        value={formatCurrencyCrude($obscure ? 0 : goal.current)}
        status="neutral"
      />
      <Metric
        label="Target"
        value={formatCurrencyCrude($obscure ? 0 : goal.target)}
        status="neutral"
      />
    </div>

    <Progress small showPercent={false} progressPercent={completed} />
    <div class="flex justify-between text-muted-foreground text-sm mt-1.5">
      <div class="font-medium text-foreground">{progressLabel}</div>
      <div>{targetDateText}</div>
    </div>
  </div>

  <div
    class="flex-1 flex flex-col justify-end mt-3 pt-3 border-t border-border-subtle">
    <GoalHealth {goal} compact />
  </div>
</Card>
