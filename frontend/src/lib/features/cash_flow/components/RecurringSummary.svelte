<script lang="ts">
import type { RecurringAnalysis } from "$lib/domain/recurring_analysis";
import { summarizeRecurring } from "$lib/domain/recurring_analysis";
import type { Dayjs } from "dayjs";
interface Props {
  items: RecurringAnalysis[];
  asOf: Dayjs;
  compact?: boolean;
}
let { items, asOf, compact = false }: Props = $props();
let summary = $derived(summarizeRecurring(items, asOf));
function amount(value: number, commodity: string) {
  return `${
    value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } ${commodity}`;
}
</script>
<div data-testid="recurring-intelligence-summary" class="min-w-0">
  {#each summary.totals as total (total.commodity)}
    <dl class="grid grid-cols-2 gap-4 py-2 text-sm sm:grid-cols-4">
      <div><dt class="text-xs text-muted-foreground">Monthly commitments</dt><dd class="font-semibold tabular-nums">~{amount(total.monthly, total.commodity)}</dd></div>
      {#if !compact}<div><dt class="text-xs text-muted-foreground">Annualized commitments</dt><dd class="font-semibold tabular-nums">~{amount(total.annual, total.commodity)}</dd></div>{/if}
      <div><dt class="text-xs text-muted-foreground">Upcoming 7 days</dt><dd class="font-semibold tabular-nums">~{amount(total.upcoming7, total.commodity)}</dd></div>
      {#if !compact}<div><dt class="text-xs text-muted-foreground">Upcoming 30 days</dt><dd class="font-semibold tabular-nums">~{amount(total.upcoming30, total.commodity)}</dd></div>{/if}
    </dl>
  {:else}<p class="text-sm text-muted-foreground">No confirmed expense commitments with comparable amounts.</p>{/each}
  {#if summary.unestimatedCount > 0}<p class="mt-2 text-xs text-muted-foreground">{summary.unestimatedCount} expense patterns have uncertain timing and are excluded from monthly and annual estimates.</p>{/if}
  <p class="mt-2 text-xs text-muted-foreground">{summary.attentionCount} need attention · Expense estimates only; income, transfers and suggestions excluded.</p>
</div>
