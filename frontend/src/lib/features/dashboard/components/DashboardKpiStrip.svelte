<script lang="ts">
import type { BudgetSummary, CashSummary, DashboardTrend } from "../summary";
import Metric from "$lib/shared/layout/Metric.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import { formatCurrency } from "$lib/shared/formatters/currency";

interface Props {
  netWorth?: number;
  netWorthTrend?: DashboardTrend;
  cash: CashSummary;
  expenses: number;
  expenseTrend?: DashboardTrend;
  expenseRecorded: boolean;
  budget: BudgetSummary;
  period: string;
  loading?: boolean;
}

let {
  netWorth,
  netWorthTrend,
  cash,
  expenses,
  expenseTrend,
  expenseRecorded,
  budget,
  period,
  loading = false,
}: Props = $props();
</script>

<div class="py-2 mb-2" data-testid="dashboard-kpis">
  <MetricStrip cols={4}>
    <a href="/assets/networth"
      class="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]">
      <Metric
        label="Net Worth"
        value={netWorth === undefined ? "—" : formatCurrency(netWorth)}
        trend={netWorthTrend?.text}
        trendStatus={netWorthTrend?.status}
        loading={loading}
      />
    </a>
    <a href="/assets/balance"
      class="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]">
      <Metric
        label="Cash Balance"
        value={cash.available ? formatCurrency(cash.total) : "—"}
        secondary={cash.available
          ? `Across ${cash.count} ${cash.count === 1 ? "account" : "accounts"}`
          : "No cash accounts"}
        status={cash.status}
        loading={loading}
      />
    </a>
    <a href={`/expense/monthly?period=${period}`}
      class="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]">
      <Metric
        label="Expenses"
        value={formatCurrency(expenses)}
        secondary={expenseRecorded ? "Month to date" : "No expenses recorded this month"}
        trend={expenseTrend?.text}
        trendStatus={expenseTrend?.status}
        loading={loading}
      />
    </a>
    <a href={`/expense/budget?period=${period}`}
      class="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]">
      <Metric
        label="Budget"
        value={budget.statusLabel}
        secondary={budget.configured
          ? `${formatCurrency(budget.actual)} spent of ${formatCurrency(budget.planned)} planned`
          : undefined}
        status={budget.status}
        loading={loading}
      />
    </a>
  </MetricStrip>
</div>
