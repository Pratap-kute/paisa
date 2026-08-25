<script lang="ts">
  import { api } from "$lib/api";
  import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatPercentage } from "$lib/shared/formatters/currency";
import { restName, firstName } from "$lib/domain/account";
import type { IncomeStatement } from "$lib/domain/cash_flow";
import { onMount } from "svelte";
    import { buildIncomeStatementWaterfall } from "$lib/features/cash_flow/income_statement_data";
  import { dateMin, dateMax, year } from "../../../../store";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import FinancialYearPicker from "$lib/shared/ui/FinancialYearPicker.svelte";
  import { iconify } from "$lib/shared/ui/icon";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
  import Metric from "$lib/shared/layout/Metric.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import IncomeStatementWaterfallChart from "$lib/features/cash_flow/components/IncomeStatementWaterfallChart.svelte";
import { keys, maxBy, minBy, some, sortBy, values } from "$lib/shared/utils/collection";

  let isEmpty = $state(false);
  let isLoading = $state(true);

  let incomeStatement: IncomeStatement | null = $state(null);
  let yearly: Record<string, IncomeStatement> = $state({});
  let diff: number = $state(0);
  let diffPercent: number = $state(0);
  let years: string[] = $state([]);
  let waterfallData = $derived(incomeStatement ? buildIncomeStatementWaterfall(incomeStatement) : { steps: [], endingBalance: 0 });

  type AccountGroupName =
    | "income"
    | "interest"
    | "equity"
    | "pnl"
    | "liabilities"
    | "tax"
    | "expenses";
  interface AccountGroup {
    key: AccountGroupName;
    accounts: string[];
    label: string;
    multiplier: number;
  }

  function formatUnlessZero(value: number) {
    if (value != 0) {
      return formatCurrency(value);
    }
    return "";
  }

  function changeClass(value: number) {
    if (value > 0) return "text-[var(--paisa-positive)]";
    if (value < 0) return "text-[var(--paisa-negative)]";
    return "text-[var(--paisa-muted-foreground)]";
  }

  const sum = (object: Record<string, number>) => Object.values(object).reduce((a, b) => a + b, 0);

  let accountGroups: AccountGroup[] = $state([]);

  $effect(() => {
    if (yearly) {
      if (yearly[$year] == null) {
        incomeStatement = null;
        isEmpty = true;
      } else {
        incomeStatement = yearly[$year];
        years = sortBy(keys(yearly)).reverse();
        diff = incomeStatement.endingBalance - incomeStatement.startingBalance;
        diffPercent = diff / incomeStatement.startingBalance;

        isEmpty = false;
      }
    }
  });

  function uniqueAccounts(statements: IncomeStatement[], key: AccountGroupName) {
    const accounts = new Set<string>();
    for (const statement of statements) {
      for (const account of keys(statement[key])) {
        accounts.add(account);
      }
    }
    return Array.from(accounts).sort();
  }

  onMount(async () => {
    try {
      ({ yearly } = await api.incomeStatement.getIncomeStatement() as unknown as {
        yearly: Record<string, IncomeStatement>;
      });
      const statements = values(yearly);
      const earliest = minBy(statements, (statement) => statement.date);
      const latest = maxBy(statements, (statement) => statement.date);
      if (earliest) {
        dateMin.set(earliest.date);
      }
      if (latest) {
        dateMax.set(latest.date);
      }
      if (!$year) {
        const sortedYears = Object.keys(yearly).sort();
        const latestYear = sortedYears[sortedYears.length - 1];
        if (latestYear) year.set(latestYear);
      }

      const rawGroups: AccountGroup[] = [
        {
          key: "income",
          accounts: uniqueAccounts(values(yearly), "income"),
          label: "Income",
          multiplier: -1,
        },
        {
          key: "tax",
          accounts: uniqueAccounts(values(yearly), "tax"),
          label: "Tax",
          multiplier: -1,
        },
        {
          key: "interest",
          accounts: uniqueAccounts(values(yearly), "interest"),
          label: "Interest",
          multiplier: -1,
        },
        {
          key: "pnl",
          accounts: uniqueAccounts(values(yearly), "pnl"),
          label: "Gain / Loss",
          multiplier: 1,
        },
        {
          key: "equity",
          accounts: uniqueAccounts(values(yearly), "equity"),
          label: "Equity",
          multiplier: -1,
        },
        {
          key: "liabilities",
          accounts: uniqueAccounts(values(yearly), "liabilities"),
          label: "Liabilities",
          multiplier: -1,
        },
        {
          key: "expenses",
          accounts: uniqueAccounts(values(yearly), "expenses"),
          label: "Expenses",
          multiplier: -1,
        },
      ];
      accountGroups = rawGroups.filter(
        (g) =>
          g.accounts.length > 0 ||
          some(values(yearly), (y) => y[g.key] && Math.abs(sum(y[g.key])) > 0),
      );

      isLoading = false;
    } catch {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Income Statement - {$year} - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Income Statement"
    description="Yearly profit and loss statement across all accounts"
  >
    {#snippet actions()}
      <div class="inline-flex items-center sm:hidden">
        <FinancialYearPicker bind:value={$year} dateMin={$dateMin} dateMax={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  {#if incomeStatement || isLoading}
    <MetricStrip cols={4}>
      <Metric label="Selected Year" value={$year} loading={isLoading} />
      <Metric
        label="Starting Net Worth"
        value={incomeStatement ? formatCurrency(incomeStatement.startingBalance) : "—"}
        loading={isLoading}
      />
      <Metric
        label="Ending Net Worth"
        value={incomeStatement ? formatCurrency(incomeStatement.endingBalance) : "—"}
        loading={isLoading}
      />
      <Metric
        label="Net Change"
        value={incomeStatement ? formatCurrency(diff) : "—"}
        secondary={incomeStatement ? formatPercentage(diffPercent, 2) : undefined}
        status={diff >= 0 ? "positive" : "negative"}
        loading={isLoading}
        class="[&_.paisa4-metric-meta]:whitespace-normal [&_.paisa4-metric-value]:overflow-visible [&_.paisa4-metric-value]:whitespace-normal"
      />
    </MetricStrip>
  {/if}

  <Section
    title="Cash Flow Overview"
    subtitle="Yearly income statement flow visualization"
  >
    {#if !isLoading && isEmpty}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No transactions recorded for the selected year.
        </p>
      </ZeroState>
    {:else}
      <ChartFrame height="tall">
        <IncomeStatementWaterfallChart
          data={waterfallData}
          ariaLabel="Income statement waterfall from starting to ending net worth"
          testId="income-statement-waterfall-echart"
        />
      </ChartFrame>
    {/if}
  </Section>

  <Section
    title="Detailed Statement"
    subtitle="Multi-year account comparison"
  >
    <div class="max-h-[min(650px,calc(100vh-280px))] min-h-[300px] max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] shadow-sm">
      {#if isLoading}
        <div class="flex flex-col gap-[var(--paisa-space-2)] p-[var(--paisa-space-4)]" aria-hidden="true">
          {#each Array(8) as _}
            <div class="h-5 animate-pulse rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-hover)]"></div>
          {/each}
        </div>
      {:else}
        <table class="mb-0 w-full min-w-max border-separate border-spacing-0 text-sm text-[var(--paisa-text-primary)]">
          <thead>
            <tr>
              <th class="sticky left-0 top-0 z-20 min-w-[220px] max-w-[280px] border-b border-r border-[var(--paisa-border-default)] bg-[var(--paisa-table-header-bg)] px-4 py-3 text-left font-semibold text-[var(--paisa-table-header-text)] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                Account
              </th>
              {#each years as y}
                <th class="sticky top-0 z-10 min-w-[120px] border-b border-[var(--paisa-border-default)] bg-[var(--paisa-table-header-bg)] px-3.5 py-3 text-right font-semibold tabular-nums text-[var(--paisa-table-header-text)]">
                  {y}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each accountGroups as group}
              <tr class="bg-[var(--paisa-surface-hover)]">
                <th class="sticky left-0 z-10 min-w-[220px] max-w-[280px] border-b border-r border-t border-[var(--paisa-border-default)] bg-[var(--paisa-surface-hover)] px-4 py-2.5 text-left font-bold text-[var(--paisa-brand-primary)] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                  {group.label}
                </th>
                {#each years as y}
                  <td class="min-w-[120px] border-b border-t border-[var(--paisa-border-default)] bg-[var(--paisa-surface-hover)] px-3.5 py-2.5 text-right font-bold tabular-nums text-[var(--paisa-brand-primary)]">
                    {#if yearly[y]?.[group.key]}
                      {formatUnlessZero(sum(yearly[y][group.key]) * group.multiplier)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#each group.accounts as account}
                <tr class="group transition-colors hover:bg-[var(--paisa-surface-hover)]/40">
                  <th class="custom-icon sticky left-0 z-[1] min-w-[220px] max-w-[280px] truncate whitespace-nowrap border-b border-r border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-4 py-2 text-left text-xs font-normal text-[var(--paisa-text-secondary)] shadow-[2px_0_4px_rgba(0,0,0,0.06)] transition-colors group-hover:bg-[var(--paisa-surface-hover)]/70">
                    <span class="pl-3">
                      {iconify(restName(account), { group: firstName(account) })}
                    </span>
                  </th>
                  {#each years as y}
                    <td class="min-w-[120px] whitespace-nowrap border-b border-[var(--paisa-border-subtle)] px-3.5 py-2 text-right text-xs tabular-nums text-[var(--paisa-text-secondary)] transition-colors group-hover:bg-[var(--paisa-surface-hover)]/40">
                      {#if yearly[y]?.[group.key]?.[account]}
                        {formatUnlessZero(yearly[y][group.key][account] * group.multiplier)}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            {/each}
          </tbody>
          <tfoot class="border-t-2 border-[var(--paisa-border-strong)]">
            <tr class="bg-[var(--paisa-surface-default)]">
              <th class="sticky left-0 z-10 min-w-[220px] max-w-[280px] border-b border-r border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-4 py-2.5 text-left font-bold text-[var(--paisa-foreground)] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Change</th>
              {#each years as y}
                {#if yearly[y]}
                  {@const yearDiff = yearly[y].endingBalance - yearly[y].startingBalance}
                  <td class="min-w-[120px] border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-3.5 py-2.5 text-right font-bold tabular-nums {changeClass(yearDiff)}">
                    <div>{formatCurrency(yearDiff)}</div>
                    <div class="text-xs font-normal opacity-85">{formatPercentage(yearDiff / yearly[y].startingBalance)}</div>
                  </td>
                {:else}
                  <td class="min-w-[120px] border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-3.5 py-2.5"></td>
                {/if}
              {/each}
            </tr>
            <tr class="bg-[var(--paisa-surface-default)]">
              <th class="sticky left-0 z-10 min-w-[220px] max-w-[280px] border-b border-r border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-4 py-2.5 text-left font-bold text-[var(--paisa-foreground)] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">End Balance</th>
              {#each years as y}
                <td class="min-w-[120px] border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-3.5 py-2.5 text-right font-bold tabular-nums text-[var(--paisa-foreground)]">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].endingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
            <tr class="bg-[var(--paisa-surface-default)]">
              <th class="sticky left-0 z-10 min-w-[220px] max-w-[280px] border-r border-[var(--paisa-border-default)] bg-[var(--paisa-surface-raised)] px-4 py-2.5 text-left font-bold text-[var(--paisa-foreground)] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Start Balance</th>
              {#each years as y}
                <td class="min-w-[120px] bg-[var(--paisa-surface-raised)] px-3.5 py-2.5 text-right font-bold tabular-nums text-[var(--paisa-foreground)]">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].startingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
          </tfoot>
        </table>
      {/if}
    </div>
  </Section>
</Page>
