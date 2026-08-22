<script lang="ts">
  import { scheduleIcon } from "$lib/domain/transaction_sequence";
  import {
    formatCurrency,
    formatCurrencyCrude,
    postingUrl,
    tooltip,
    type TransactionSchedule,
  } from "$lib/core/utils";

  interface Props {
    schedule: TransactionSchedule;
    amount?: string;
  }

  let { schedule, amount }: Props = $props();

  let icon = $derived(scheduleIcon(schedule));

  const iconColorClasses: Record<string, string> = {
    "has-text-success": "text-[var(--paisa-positive)]",
    "has-text-danger": "text-[var(--paisa-negative)]",
    "has-text-grey": "text-[var(--paisa-muted-foreground)]",
    "has-text-warning-dark": "text-[var(--paisa-warning)]",
  };

  let tooltipHtml = $derived(
    tooltip(
      [
        [
          "Due Date",
          [schedule.scheduled.format("DD MMM YYYY"), "has-text-weight-bold has-text-right"],
        ],
        [
          "Cleared On",
          [schedule.actual?.format("DD MMM YYYY") || "", "has-text-weight-bold has-text-right"],
        ],
        ["Amount", [formatCurrency(schedule.amount), "has-text-weight-bold has-text-right"]],
      ],
      { header: schedule.key },
    ),
  );

  let displayAmount = $derived(amount ?? formatCurrencyCrude(schedule.amount));
</script>

<div
  class="flex items-center justify-between gap-2 px-2 text-sm"
  data-tippy-content={tooltipHtml}
>
  <div class="min-w-0 truncate" title={schedule.key}>
    <span class="inline-flex items-center {iconColorClasses[icon.color] || ''}">
      <i class="fas {icon.icon}" aria-hidden="true"></i>
    </span>
    <span class="ml-1 text-[var(--paisa-foreground)]">
      {#if schedule.actual}
        <a class="secondary-link hover:text-[var(--paisa-primary)]" href={postingUrl(schedule.transaction.postings[0])}>
          {schedule.key}
        </a>
      {:else}
        {schedule.key}
      {/if}
    </span>
  </div>
  <div class="shrink-0 font-semibold tabular-nums text-[var(--paisa-foreground)]">
    {displayAmount}
  </div>
</div>
