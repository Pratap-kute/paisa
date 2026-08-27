<script lang="ts">
import { now } from "$lib/domain/time";
import type { TransactionSequence } from "$lib/domain/recurring";
import {
  intervalText,
  nextUnpaidSchedule,
  totalRecurring,
} from "$lib/domain/transaction_sequence";
import { scheduleIcon } from "$lib/features/cash_flow/schedule_presentation";
import { formatCurrencyCrude } from "$lib/shared/formatters/currency";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  transactionSequece: TransactionSequence;
}

let { transactionSequece }: Props = $props();

let schedule = $derived(nextUnpaidSchedule(transactionSequece));
let n = $derived(schedule?.scheduled);
let icon = $derived(
  schedule ? scheduleIcon(schedule) : { color: "", icon: "" },
);
</script>

{#if schedule && n}
  <div class="mb-0 text-center">
  <div
    class="truncate text-xs font-medium text-[var(--paisa-foreground)]">{transactionSequece.key}</div>
  <div class="my-1">
    <Badge variant="neutral" size="sm"
      rounded>{intervalText(transactionSequece)}</Badge>
  </div>
  <div class="text-xs text-[var(--paisa-muted-foreground)]">
      <span class="text-[var(--paisa-muted-foreground)]">
        <i class="fas fa-calendar text-[10px]" aria-hidden="true"></i>
      </span>
      {schedule.scheduled.format("DD MMM YYYY")}
    </div>
  <div class="paisa-grid justify-center">
    <div
      class="mx-3 mt-3 radial-progress text-xs paisa-text-muted paisa-opacity-20"
      style="--value: 100; --thickness: 3px; --size: 100px; grid-area: 1/1"
    ></div>
    <div
      class="mx-3 mt-3 radial-progress text-xs {icon.color}"
      style="--value: {n.isBefore(now())
          ? '0'
          : (schedule.scheduled.diff(now(), 'day') / transactionSequece.interval) *
            100}; --thickness: 3px; --size: 100px; ; grid-area: 1/1"
    >
      <div class="text-base">
        <span>
          <i class="fas {icon.icon}" aria-hidden="true"></i>
        </span>
      </div>
      <span
        class="font-bold">{formatCurrencyCrude(totalRecurring(transactionSequece))}</span>
      <span
        class="text-xs">{n.isBefore(now()) ? 'past due' : `due ${n.fromNow()}`}</span>
    </div>
  </div>
</div>
{/if}
