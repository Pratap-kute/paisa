<script lang="ts">
import Card from "$lib/shared/ui/Card.svelte";
import { formatPercentage } from "$lib/shared/formatters/currency";
import type { GoalSummary } from "$lib/domain/goals_models";
import { iconGlyph } from "$lib/shared/ui/icon";
import { formatCurrency } from "$lib/shared/formatters/currency";
import Metric from "$lib/shared/layout/Metric.svelte";
import Progress from "$lib/shared/ui/Progress.svelte";
import dayjs from "dayjs";
import type { Action } from "svelte/action";

interface Props {
  goal: GoalSummary;
  small?: boolean;
  action?: Action;
}

let { goal, small = false, action = null }: Props = $props();

function formatDate(date: string) {
  const d = dayjs(date, "YYYY-MM-DD", true);
  if (d.isValid()) {
    return d.fromNow();
  }
  return "";
}

function percentComplete(goal: GoalSummary) {
  if (goal.target === 0) {
    return 0;
  }

  return (goal.current / goal.target) * 100;
}

let completed = $derived(percentComplete(goal));
</script>

<Card padding="sm" class={small ? "mb-3" : ""}>
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center min-w-0">
      {#if action}
        <span
          use:action
          class="mr-2 text-lg text-muted-foreground paisa-clickable shrink-0"
        >
          <i class="fas fa-grip-vertical"></i>
        </span>
      {/if}
      <a
        class="secondary-link text-muted-foreground min-w-0"
        href="/more/goals/{goal.type}/{encodeURIComponent(goal.name)}"
      >
        <h4 class="text-xl text-muted-foreground truncate">{goal.name}</h4>
      </a>
    </div>
    {#if goal.icon}
      <span
        class="{small ? 'text-2xl' : 'text-3xl'} custom-icon inline-flex items-center shrink-0"
        >{iconGlyph(goal.icon)}</span
      >
    {/if}
  </div>
  <div class="grid grid-cols-2 gap-3 mb-3">
    <Metric label="Current" value={formatCurrency(goal.current)}
      status="positive" />
    <Metric label="Target" value={formatCurrency(goal.target)}
      status="primary" />
  </div>
  <Progress small showPercent={false} progressPercent={completed} />
  <div
    class="flex justify-between text-muted-foreground text-sm mt-1">
    <div>{formatPercentage(completed / 100, 2)}</div>
    <div>{formatDate(goal.targetDate)}</div>
  </div>
</Card>
