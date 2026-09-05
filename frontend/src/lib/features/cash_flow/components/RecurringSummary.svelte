<script lang="ts">
import { obscure } from "$lib/shared/state/persisted";
import { formatCommodityAmount } from "$lib/shared/formatters/currency";
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
  return formatCommodityAmount(value, commodity, $obscure);
}
</script>
<div data-testid="recurring-intelligence-summary" class="min-w-0">
  {#each summary.totals as total (total.commodity)}
    <dl class="grid grid-cols-2 gap-4 py-2 text-sm sm:grid-cols-4">
      <div><dt class="text-xs text-muted-foreground">Monthly expenses</dt><dd class="font-semibold tabular-nums">~{amount(total.monthly, total.commodity)}</dd></div>
      {#if !compact}<div><dt class="text-xs text-muted-foreground">Annualized expenses</dt><dd class="font-semibold tabular-nums">~{amount(total.annual, total.commodity)}</dd></div>{/if}
      <div><dt class="text-xs text-muted-foreground">Payments in 7 days</dt><dd class="font-semibold tabular-nums">~{amount(total.upcoming7, total.commodity)}</dd></div>
      {#if !compact}<div><dt class="text-xs text-muted-foreground">Payments in 30 days</dt><dd class="font-semibold tabular-nums">~{amount(total.upcoming30, total.commodity)}</dd></div>{/if}
    </dl>
  {:else}<p class="text-sm text-muted-foreground">No confirmed expense commitments with comparable amounts.</p>{/each}
  {#if summary.unestimatedCount > 0}<p class="mt-2 text-xs text-muted-foreground">{summary.unestimatedCount} expense patterns have uncertain timing and are excluded from monthly and annual estimates.</p>{/if}
  <p class="mt-2 text-xs text-muted-foreground">{summary.attentionCount} need attention · Expense totals exclude repayments. Upcoming payments include debt repayments; income, investments, internal transfers and suggestions are excluded.</p>
</div>
