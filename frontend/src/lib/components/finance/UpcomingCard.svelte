<script lang="ts">
  import {
    intervalText,
    nextUnpaidSchedule,
    scheduleIcon,
    totalRecurring
  } from "$lib/domain/transaction_sequence";
  import { formatCurrencyCrude, now, type TransactionSequence } from "$lib/core/utils";

  interface Props {
    transactionSequece: TransactionSequence;
  }

  let { transactionSequece }: Props = $props();

  let schedule = $derived(nextUnpaidSchedule(transactionSequece));
  let n = $derived(schedule?.scheduled);
  let icon = $derived(schedule ? scheduleIcon(schedule) : { color: "", icon: "" });
</script>

{#if schedule && n}
  <div class="has-text-centered mb-0 mr-3 paisa-max-width-200">
    <div class="is-size-7 paisa-truncate">{transactionSequece.key}</div>
    <div class="my-1">
      <span class="tag">{intervalText(transactionSequece)}</span>
    </div>
    <div class="has-text-grey is-size-7">
      <span class="icon has-text-grey-light">
        <i class="fas fa-calendar"></i>
      </span>
      {schedule.scheduled.format("DD MMM YYYY")}
    </div>
    <div class="paisa-grid is-justify-content-center">
      <div
        class="mx-3 mt-3 radial-progress is-size-7 has-text-grey-lighter paisa-opacity-20"
        style="--value: 100; --thickness: 3px; --size: 100px; grid-area: 1/1"
      ></div>
      <div
        class="mx-3 mt-3 radial-progress is-size-7 {icon.color}"
        style="--value: {n.isBefore(now())
          ? '0'
          : (schedule.scheduled.diff(now(), 'day') / transactionSequece.interval) *
            100}; --thickness: 3px; --size: 100px; ; grid-area: 1/1"
      >
        <div class="is-size-6">
          <span class="icon">
            <i class="fas {icon.icon}"></i>
          </span>
        </div>
        <span>{formatCurrencyCrude(totalRecurring(transactionSequece))}</span>
        <span>due {n.fromNow()}</span>
      </div>
    </div>
  </div>
{/if}
