<script lang="ts">
  import {
    enrichTrantionSequence,
    nextUnpaidSchedule,
    sortTrantionSequence
  } from "$lib/domain/transaction_sequence";
  import {
    ajax,
    helpUrl,
    isMobile,
    monthDays,
    type TransactionSchedule,
    type TransactionSequence
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
  let transactionSequences: TransactionSequence[] = $state([]);
  let transactionSequencesDelayed: TransactionSequence[] = $state([]);

  let days: Dayjs[] = $derived(monthDays($month).days);
  let schedulesByDate: Record<string, TransactionSchedule[]> = $derived(
    _.chain(transactionSequences)
      .flatMap((ts) => (ts.schedulesByMonth && ts.schedulesByMonth[$month]) || [])
      .groupBy((s) => s.scheduled.format("YYYY-MM-DD"))
      .value()
  );

  onMount(async () => {
    ({ transaction_sequences: transactionSequences } = await ajax("/api/recurring"));

    if (_.isEmpty(transactionSequences)) {
      isEmpty = true;
    }

    transactionSequences = sortTrantionSequence(enrichTrantionSequence(transactionSequences));

    setAllowedDateRange(
      _.compact(_.flatMap(transactionSequences, (ts) => ts.schedules.map((s) => s.scheduled)))
    );

    transactionSequencesDelayed = transactionSequences;
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Recurring Transactions"
    description="Track scheduled payments, bills, and subscriptions"
  />

  {#if !isEmpty}
    <Section title="Calendar">
      <div
        class="has-text-centered paisa-grid recurring-weekdays weekdays-grid is-uppercase mb-3 is-hidden-mobile"
      >
        {#each dayjs.weekdaysShort(true) as day}
          <div>{day}</div>
        {/each}
      </div>
      <div
        class="paisa-grid recurring-calendar gap-2 paisa-overflow-y-auto pb-1"
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

  <Section title="Recurring Schedules">
    <ZeroState item={!isEmpty}>
      <strong>Oops!</strong> You haven't configured any recurring transactions yet. Checkout the
      <a href={helpUrl("recurring")}>docs</a> page to get started.
    </ZeroState>
    <div class="paisa-recurring-cards-list">
      {#each transactionSequencesDelayed as ts}
        <RecurringCard {ts} schedule={nextUnpaidSchedule(ts)} />
      {/each}
    </div>
  </Section>
</Page>

<style lang="scss">
  .recurring-weekdays,
  .recurring-calendar {
    grid-auto-columns: 1fr;
    grid-auto-rows: 1fr;
  }

  .recurring-weekdays {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }

  .recurring-calendar {
    grid-template-columns: minmax(0, 1fr);
  }

  @media screen and (min-width: 769px) {
    .recurring-calendar {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
  }

  .paisa-recurring-cards-list {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-3);
  }
</style>
