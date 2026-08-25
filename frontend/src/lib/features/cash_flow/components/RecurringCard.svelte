<script lang="ts">
import { now } from "$lib/domain/time";
import type { TransactionSchedule } from "$lib/domain/recurring";
import type { TransactionSequence } from "$lib/domain/recurring";
import { intervalText, totalRecurring } from "$lib/domain/transaction_sequence";
import { formatCurrencyCrude } from "$lib/shared/formatters/currency";
import Badge from "$lib/shared/ui/Badge.svelte";
import RecurringSchedule from "./RecurringSchedule.svelte";

interface Props {
  ts: TransactionSequence;
  schedule: TransactionSchedule;
  compact?: boolean;
}

let { ts, schedule, compact = true }: Props = $props();

let isPastDue = $derived(
  schedule?.scheduled ? schedule.scheduled.isBefore(now(), "day") : false,
);
let dueAmount = $derived(formatCurrencyCrude(totalRecurring(ts)));
</script>

{#if compact}
  <div
  class="rounded-lg border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] p-3 transition-colors hover:bg-[var(--paisa-surface-hover)]"
>
  <RecurringSchedule {schedule} amount={dueAmount} />
  <div
    class="mt-1.5 flex flex-wrap items-center gap-2 px-2 text-xs text-[var(--paisa-muted-foreground)]">
      <Badge variant="neutral" size="sm" rounded>{intervalText(ts)}</Badge>
      {#if schedule?.scheduled}
        <span class="tabular-nums">{schedule.scheduled.format("DD MMM YYYY")}</span>
        <span aria-hidden="true">·</span>
        <span class={isPastDue ? "font-medium text-[var(--paisa-negative)]" : ""}>
          {isPastDue ? "Past due" : `Due ${schedule.scheduled.fromNow()}`}
        </span>
      {/if}
    </div>
</div>
{:else}
  <div
  class="rounded-lg border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] p-4"
>
  <div
    class="mb-3 text-base font-semibold text-[var(--paisa-muted-foreground)]">{ts.key}</div>
  <RecurringSchedule {schedule} amount={dueAmount} />
  <div
    class="mt-2 flex flex-wrap items-center gap-2 px-2 text-xs text-[var(--paisa-muted-foreground)]">
      <Badge variant="neutral" size="sm" rounded>{intervalText(ts)}</Badge>
      {#if schedule?.scheduled}
        <span class="tabular-nums">{schedule.scheduled.format("DD MMM YYYY")}</span>
        <span aria-hidden="true">·</span>
        <span class={isPastDue ? "font-medium text-[var(--paisa-negative)]" : ""}>
          {isPastDue ? "Past due" : `Due ${schedule.scheduled.fromNow()}`}
        </span>
      {/if}
    </div>
</div>
{/if}
