<script lang="ts">
  import { renderBreakdowns } from "$lib/charts/schedule_al";
  import _ from "lodash";
  import { ajax, type ScheduleAL } from "$lib/core/utils";
  import { onMount } from "svelte";
  import { dateMin, year } from "../../../../../store";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let scheduleAls: Record<string, ScheduleAL> | null = $state(null);
  let selectedScheduleAl: ScheduleAL | null = $derived(
    scheduleAls ? scheduleAls[$year] ?? null : null
  );
  let hasEntries = $derived((selectedScheduleAl?.entries?.length ?? 0) > 0);

  $effect(() => {
    if (selectedScheduleAl) {
      renderBreakdowns(selectedScheduleAl.entries);
    }
  });

  onMount(async () => {
    ({ schedule_als: scheduleAls } = await ajax("/api/schedule_al"));

    const firstScheduleAl = _.minBy(Object.values(scheduleAls), (e) => e.date);
    if (firstScheduleAl) {
      dateMin.set(firstScheduleAl.date);
    }
  });
</script>

<svelte:head>
  <title>Schedule AL — Paisa</title>
</svelte:head>

<div class="flex w-full min-w-0 max-w-full flex-col gap-5">
  <PageHeader
    title="Schedule AL"
    description="Statement of Assets and Liabilities for Income Tax filing"
  />

  <div class="flex w-full min-w-0 flex-col gap-4">
    {#if scheduleAls}
      {#if selectedScheduleAl}
        <p class="m-0 text-sm text-[var(--paisa-muted-foreground)]">
          Schedule AL as on
          <span class="font-semibold text-[var(--paisa-foreground)]">
            {selectedScheduleAl.date.format("DD MMM YYYY")}
          </span>
        </p>
      {/if}

      {#if hasEntries}
        <div class="w-full min-w-0 overflow-x-auto rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] shadow-[var(--paisa-shadow-sm)]">
          <table class="mb-0 w-full min-w-[640px] border-collapse text-[0.8125rem]">
            <thead>
              <tr class="border-b border-[var(--paisa-border)] bg-[var(--paisa-surface-raised)] text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--paisa-muted-foreground)]">
                <th class="px-3 py-2.5 text-left">Code</th>
                <th class="px-3 py-2.5 text-left">Section</th>
                <th class="px-3 py-2.5 text-left">Details</th>
                <th class="px-3 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="d3-schedule-al text-[var(--paisa-foreground)]"></tbody>
          </table>
        </div>
      {:else}
        <ZeroState item={[]}>
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paisa-surface-raised)] text-xl text-[var(--paisa-muted-foreground)]">
            <i class="fa-solid fa-file-invoice"></i>
          </div>
          <div class="mb-1 text-[0.9375rem] font-semibold text-[var(--paisa-foreground)]">
            No Schedule AL data for the selected financial year
          </div>
          <div class="max-w-[360px] text-[0.8125rem] text-[var(--paisa-muted-foreground)]">
            Configure Schedule AL entries in settings or select a different financial year.
          </div>
        </ZeroState>
      {/if}
    {:else}
      <div class="flex items-center justify-center gap-3 rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] px-6 py-16 text-sm text-[var(--paisa-muted-foreground)]">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paisa-border-strong)] border-t-[var(--paisa-primary)]"></div>
        <span>Loading Schedule AL...</span>
      </div>
    {/if}
  </div>
</div>
