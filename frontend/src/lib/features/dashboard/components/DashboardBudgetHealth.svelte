<script lang="ts">
import type { BudgetSummary } from "../summary";
import { restName } from "$lib/domain/account";
import { presentInsight } from "$lib/features/insights/presentation";
import { formatCurrency } from "$lib/shared/formatters/currency";

interface Props {
  summary: BudgetSummary;
  period: string;
  isPartial?: boolean;
  comparisonPeriod?: string;
}

let { summary, period, isPartial = false, comparisonPeriod }: Props = $props();
</script>

<section
  class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0"
  data-testid="dashboard-budget-health">
  <div class="flex items-center justify-between mb-3 gap-2">
    <a href={`/expense/budget?period=${period}`} class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">Budget Health</a>
    <a href={`/expense/budget?period=${period}`} class="text-xs font-semibold text-[var(--paisa-primary)] uppercase tracking-wider hover:underline">View Budget</a>
  </div>
  <p class="text-base font-semibold text-[var(--paisa-foreground)]">{summary.statusLabel}</p>
  {#if summary.configured}
    <p class="mt-1 text-xs text-[var(--paisa-muted-foreground)] tabular-nums">
      {formatCurrency(summary.actual)} spent of {formatCurrency(summary.planned)} planned
    </p>
  {/if}

  {#if summary.accounts.length > 0}
    <div class="mt-3 divide-y divide-[var(--paisa-border-subtle)]">
      {#each summary.accounts as item (item.budget.account)}
        {@const p = presentInsight(item.insight, isPartial, comparisonPeriod)}
        <a href={p.href || `/expense/budget?period=${period}`} class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:text-[var(--paisa-primary)]" data-testid="dashboard-budget-item">
          <span class="text-sm font-medium text-[var(--paisa-foreground)] truncate" title={item.budget.account}>{restName(item.budget.account)}</span>
          <span class="text-xs font-semibold text-[var(--paisa-warning)] whitespace-nowrap">{p.badgeText || "Needs attention"}</span>
        </a>
      {/each}
    </div>
  {/if}
</section>
