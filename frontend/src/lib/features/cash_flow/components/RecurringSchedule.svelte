<script lang="ts">
import { formatCurrencyCrude } from "$lib/shared/formatters/currency";
import { postingUrl } from "$lib/shared/browser/navigation";
import { tooltip } from "$lib/shared/charts/tooltip";
import type { TransactionSchedule } from "$lib/domain/recurring";
import { scheduleIcon } from "$lib/features/cash_flow/schedule_presentation";
import { formatCurrency } from "$lib/shared/formatters/currency";
import Tooltip from "$lib/shared/ui/Tooltip.svelte";

interface Props {
  schedule: TransactionSchedule;
  amount?: string;
}

let { schedule, amount }: Props = $props();

let icon = $derived(scheduleIcon(schedule));

let tooltipHtml = $derived(
  tooltip(
    [
      [
        "Due Date",
        [
          schedule.scheduled.format("DD MMM YYYY"),
          "paisa-text-bold paisa-text-right",
        ],
      ],
      [
        "Cleared On",
        [
          schedule.actual?.format("DD MMM YYYY") || "",
          "paisa-text-bold paisa-text-right",
        ],
      ],
      ["Amount", [
        formatCurrency(schedule.amount),
        "paisa-text-bold paisa-text-right",
      ]],
    ],
    { header: schedule.key },
  ),
);

let displayAmount = $derived(amount ?? formatCurrencyCrude(schedule.amount));
</script>

<Tooltip content={tooltipHtml}>
  {#snippet children(tooltipProps)}
    <div {...tooltipProps} class="flex items-center justify-between gap-2 px-2 text-sm">
      <div class="min-w-0 truncate" title={schedule.key}>
        <span class="inline-flex items-center {icon.color}">
          <i class="fas {icon.icon}" aria-hidden="true"></i>
        </span>
        <span class="ml-1 text-[var(--paisa-foreground)]">
          {#if schedule.actual}
            <a class="text-[var(--paisa-primary)] hover:underline" href={postingUrl(schedule.transaction.postings[0])}>
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
  {/snippet}
</Tooltip>
