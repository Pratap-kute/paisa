<script lang="ts">
  import { iconGlyph } from "$lib/core/icon";
  import { formatCurrency, formatPercentage, type GoalSummary } from "$lib/core/utils";
  import _ from "lodash";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import Progress from "$lib/components/ui/Progress.svelte";
  import COLORS from "$lib/core/colors";
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

<div class="box p-3 goal-summary-card" class:mb-3={small}>
  <div class="is-flex is-justify-content-space-between is-align-items-center mb-4">
    <div class="is-flex is-align-items-center">
      {#if action}
        <span use:action class="icon is-size-5 mr-2 has-text-grey-light paisa-clickable">
          <i class="fas fa-grip-vertical"></i>
        </span>
      {/if}
      <a
        class="secondary-link has-text-grey"
        href="/more/goals/{goal.type}/{encodeURIComponent(goal.name)}"
      >
        <h4 class="is-size-4 has-text-grey">{goal.name}</h4>
      </a>
    </div>
    {#if !_.isEmpty(goal.icon)}
      <span class="{small ? 'is-size-3' : 'is-size-2'} custom-icon is-inline-flex is-align-items-center">{iconGlyph(goal.icon)}</span>
    {/if}
  </div>
  <nav class="level grid-2">
    <LevelItem
      {small}
      narrow
      title="Current"
      color={COLORS.gainText}
      value={formatCurrency(goal.current)}
    />

    <LevelItem
      {small}
      narrow
      title="Target"
      color={COLORS.primary}
      value={formatCurrency(goal.target)}
    />
  </nav>
  <Progress small showPercent={false} progressPercent={completed} />
  <div class="is-flex is-justify-content-space-between has-text-grey">
    <div>{formatPercentage(completed / 100, 2)}</div>
    <div>{formatDate(goal.targetDate)}</div>
  </div>
</div>
