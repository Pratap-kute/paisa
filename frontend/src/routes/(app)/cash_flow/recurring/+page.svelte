<script lang="ts">
  import {
    enrichTrantionSequence,
    nextUnpaidSchedule,
    sortTrantionSequence,
  } from "$lib/domain/transaction_sequence";
  import {
    ajax,
    helpUrl,
    isMobile,
    monthDays,
    type TransactionSchedule,
    type TransactionSequence,
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import RecurringCard from "$lib/components/finance/RecurringCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import { month, setAllowedDateRange } from "../../../../store";
  import type { Dayjs } from "dayjs";
  import RecurringDay from "$lib/components/finance/RecurringDay.svelte";
  import dayjs from "dayjs";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);
  let transactionSequences: TransactionSequence[] = $state([]);
  let transactionSequencesDelayed: TransactionSequence[] = $state([]);

  let days: Dayjs[] = $derived(monthDays($month).days);
  let schedulesByDate: Record<string, TransactionSchedule[]> = $derived(
    _.chain(transactionSequences)
      .flatMap((ts) => (ts.schedulesByMonth && ts.schedulesByMonth[$month]) || [])
      .groupBy((s) => s.scheduled.format("YYYY-MM-DD"))
      .value(),
  );

  onMount(async () => {
    try {
      ({ transaction_sequences: transactionSequences } = await ajax("/api/recurring"));

      if (_.isEmpty(transactionSequences)) {
        isEmpty = true;
      }

      transactionSequences = sortTrantionSequence(enrichTrantionSequence(transactionSequences));

      setAllowedDateRange(
        _.compact(_.flatMap(transactionSequences, (ts) => ts.schedules.map((s) => s.scheduled))),
      );

      transactionSequencesDelayed = transactionSequences;
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Recurring Transactions - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="Recurring Transactions"
    description="Track scheduled payments, bills, and subscriptions"
  />

  {#if !isEmpty}
    <Section title="Calendar" subtitle="Scheduled recurring items for the selected month">
      <div
        class="mb-3 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-[var(--paisa-muted-foreground)] md:grid"
      >
        {#each dayjs.weekdaysShort(true) as day}
          <div>{day}</div>
        {/each}
      </div>
      <div
        class="grid grid-cols-1 gap-2 overflow-y-auto pb-1 md:grid-cols-7"
        style={isMobile() ? "" : "height: calc(100vh - 200px);"}
      >
        {#each days as day (day)}
          <RecurringDay
            month={$month}
            {day}
            schedules={schedulesByDate[day.format("YYYY-MM-DD")] || []}
          />
        {/each}
      </div>
    </Section>
  {/if}

  <Section title="Recurring Schedules" subtitle="Next unpaid occurrence for each recurring item">
    <ZeroState item={!isEmpty}>
      <strong>Oops!</strong> You haven't configured any recurring transactions yet. Checkout the
      <a href={helpUrl("recurring")}>docs</a> page to get started.
    </ZeroState>

    {#if isLoading && !isEmpty}
      <div class="flex flex-col gap-3" aria-hidden="true">
        {#each Array(4) as _}
          <div class="h-16 animate-pulse rounded-lg bg-[var(--paisa-surface-hover)]"></div>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-3">
        {#each transactionSequencesDelayed as ts (ts.key)}
          <RecurringCard {ts} schedule={nextUnpaidSchedule(ts)} />
        {/each}
      </div>
    {/if}
  </Section>
</Page>
