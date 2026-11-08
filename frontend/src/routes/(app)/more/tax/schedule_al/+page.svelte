<script lang="ts">
  import LoadingState from "#lib/shared/ui/LoadingState.svelte";
  import { api } from "#lib/api";
  import { formatCurrency } from "#lib/shared/formatters/currency";
  import type { ScheduleAL } from "#lib/domain/tax";
  import { scheduleALTotal } from "#lib/features/tax/schedule_al_data";
  import { onMount } from "svelte";
  import { dateMin, year } from "../../../../../store";
  import Page from "#lib/shared/layout/Page.svelte";
  import PageHeader from "#lib/shared/layout/PageHeader.svelte";
  import EmptyState from "#lib/shared/ui/EmptyState.svelte";
  import { minBy } from "#lib/shared/utils/collection";

  let scheduleAls: Record<string, ScheduleAL> | null = $state(null);
  let selectedScheduleAl: ScheduleAL | null = $derived(
    scheduleAls ? (scheduleAls[year.value] ?? null) : null,
  );
  let hasEntries = $derived((selectedScheduleAl?.entries?.length ?? 0) > 0);
  let total = $derived(scheduleALTotal(selectedScheduleAl?.entries ?? []));

  onMount(async () => {
    ({ schedule_als: scheduleAls } =
      (await api.scheduleAl.getScheduleAl()) as unknown as {
        schedule_als: Record<string, ScheduleAL>;
      });

    const firstScheduleAl = minBy(Object.values(scheduleAls), (e) => e.date);
    if (firstScheduleAl) {
      dateMin.value = firstScheduleAl.date;
    }
  });
</script>

<svelte:head>
  <title>Schedule AL - Paisa</title>
</svelte:head>

<Page width="analysis">
  <div class="flex w-full min-w-0 max-w-full flex-col gap-5">
    <PageHeader
      title="Schedule AL"
      description="Statement of Assets and Liabilities for Income Tax filing"
    />

    <div class="flex w-full min-w-0 flex-col gap-4">
      {#if scheduleAls}
        {#if selectedScheduleAl}
          <p class="m-0 text-sm text-muted-foreground">
            Schedule AL as on
            <span class="font-semibold text-foreground">
              {selectedScheduleAl.date.format("DD MMM YYYY")}
            </span>
          </p>
        {/if}

        {#if hasEntries}
          <div
            class="w-full min-w-0 overflow-x-auto rounded-[var(--paisa-radius-lg)] border border-border bg-surface shadow-[var(--paisa-shadow-sm)]"
          >
            <table
              class="mb-0 w-full min-w-[640px] border-collapse text-[0.8125rem]"
            >
              <thead>
                <tr
                  class="border-b border-border bg-surface-raised text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <th class="px-3 py-2.5 text-left">Code</th>
                  <th class="px-3 py-2.5 text-left">Section</th>
                  <th class="px-3 py-2.5 text-left">Details</th>
                  <th class="px-3 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="text-foreground">
                {#each selectedScheduleAl?.entries ?? [] as entry (`${entry.section.code}-${entry.section.section}-${entry.section.details}`)}
                  <tr class="border-b border-border-subtle">
                    <td class="px-3 py-2.5">{entry.section.code}</td>
                    <td class="px-3 py-2.5">{entry.section.section}</td>
                    <td class="px-3 py-2.5">{entry.section.details}</td>
                    <td
                      class="px-3 py-2.5 text-right font-semibold tabular-nums"
                      >{formatCurrency(entry.amount)}</td
                    >
                  </tr>
                {/each}
              </tbody>
              <tfoot>
                <tr class="bg-surface-raised font-semibold text-foreground">
                  <td class="px-3 py-2.5" colspan="2"></td>
                  <th class="px-3 py-2.5 text-left" scope="row">Total</th>
                  <td
                    class="px-3 py-2.5 text-right tabular-nums"
                    data-testid="schedule-al-total">{formatCurrency(total)}</td
                  >
                </tr>
              </tfoot>
            </table>
          </div>
        {:else}
          <EmptyState
            item={[]}
            icon="fa-file-invoice"
            title="No Schedule AL data for the selected financial year"
            description="Configure Schedule AL entries in settings or select a different financial year."
          />
        {/if}
      {:else}
        <div
          class="rounded-[var(--paisa-radius-lg)] border border-border bg-surface"
        >
          <LoadingState message="Loading Schedule AL..." />
        </div>
      {/if}
    </div>
  </div>
</Page>
