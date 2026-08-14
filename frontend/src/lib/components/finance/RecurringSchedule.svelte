<script lang="ts">
  import { scheduleIcon } from "$lib/domain/transaction_sequence";
  import {
    formatCurrency,
    formatCurrencyCrude,
    postingUrl,
    tooltip,
    type TransactionSchedule
  } from "$lib/core/utils";
  interface Props {
    schedule: TransactionSchedule;
  }

  let { schedule }: Props = $props();

  let icon = $derived(scheduleIcon(schedule));

  let tooltipHtml = $derived(
    tooltip(
      [
        [
          "Due Date",
          [schedule.scheduled.format("DD MMM YYYY"), "has-text-weight-bold has-text-right"]
        ],
        [
          "Cleared On",
          [schedule.actual?.format("DD MMM YYYY") || "", "has-text-weight-bold has-text-right"]
        ],
        ["Amount", [formatCurrency(schedule.amount), "has-text-weight-bold has-text-right"]]
      ],
      { header: schedule.key }
    )
  );
</script>

<div class="px-2 is-flex is-size-6 is-justify-content-space-between gap-2" data-tippy-content={tooltipHtml}>
  <div class="paisa-truncate" title={schedule.key}>
    <span class="icon is-small {icon.color}">
      <i class="fas {icon.icon}"></i>
    </span>
    <span class="ml-1">
      {#if schedule.actual}
        <a class="secondary-link" href={postingUrl(schedule.transaction.postings[0])}
          >{schedule.key}</a
        >
      {:else}
        {schedule.key}
      {/if}
    </span>
  </div>
  <div>{formatCurrencyCrude(schedule.amount)}</div>
</div>
