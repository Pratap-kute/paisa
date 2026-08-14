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

  let isEmpty = false;
  let transactionSequences: TransactionSequence[] = [];
  let transactionSequencesDelayed: TransactionSequence[] = [];

  let days: Dayjs[] = [];
  let schedulesByDate: Record<string, TransactionSchedule[]> = {};

  $: {
    ({ days } = monthDays($month));
    schedulesByDate = _.chain(transactionSequences)
      .flatMap((ts) => (ts.schedulesByMonth && ts.schedulesByMonth[$month]) || [])
      .groupBy((s) => s.scheduled.format("YYYY-MM-DD"))
      .value();
  }

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

<div class="section">
  <div class="container is-fluid">
    <div class="columns" class:is-hidden={isEmpty}>
      <div class="column is-12">
        <div
          class="has-text-centered paisa-grid recurring-weekdays weekdays-grid is-uppercase mb-3 is-hidden-mobile"
        >
          {#each dayjs.weekdaysShort(true) as day}
            <div>{day}</div>
          {/each}
        </div>
        <div
          class="paisa-grid recurring-calendar gap-2 paisa-overflow-y-auto pb-1"
          style={isMobile() ? "" : "height: calc(100vh - 150px);"}
        >
          {#each days as day (day)}
            <RecurringDay
              month={$month}
              {day}
              schedules={schedulesByDate[day.format("YYYY-MM-DD")] || []}
            />
          {/each}
        </div>
      </div>
    </div>
    <div class="columns mt-4">
      <div class="column is-12">
        <ZeroState item={!isEmpty}>
          <strong>Oops!</strong> You haven't configured any recurring transactions yet. Checkout the
          <a href={helpUrl("recurring")}>docs</a> page to get started.
        </ZeroState>
        {#each transactionSequencesDelayed as ts}
          <RecurringCard {ts} schedule={nextUnpaidSchedule(ts)} />
        {/each}
      </div>
    </div>
  </div>
</div>

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
</style>
