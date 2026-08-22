<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import _ from "lodash";
  import { renderIncomeStatement } from "$lib/charts/income_statement";
  import { observeElementSize } from "$lib/charts/resize";
  import {
    ajax,
    formatCurrency,
    formatPercentage,
    restName,
    type IncomeStatement,
    firstName,
  } from "$lib/core/utils";
  import { dateMin, dateMax, year } from "../../../../store";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import FinancialYearPicker from "$lib/components/ui/FinancialYearPicker.svelte";
  import { iconify } from "$lib/core/icon";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);

  let svg: Element = $state()!;
  let incomeStatement: IncomeStatement | null = $state(null);
  let renderer: ((data: IncomeStatement) => void) | undefined = $state();
  let stopResize: (() => void) | undefined;
  let yearly: Record<string, IncomeStatement> = $state({});
  let diff: number = $state(0);
  let diffPercent: number = $state(0);
  let years: string[] = $state([]);

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
    if (yearly && renderer) {
      if (yearly[$year] == null) {
        incomeStatement = null;
        isEmpty = true;
      } else {
        incomeStatement = yearly[$year];
        years = _.sortBy(_.keys(yearly)).reverse();
        diff = incomeStatement.endingBalance - incomeStatement.startingBalance;
        diffPercent = diff / incomeStatement.startingBalance;

        renderer(incomeStatement);
        isEmpty = false;
      }
    }
  });

  function uniqueAccounts(statements: IncomeStatement[], key: AccountGroupName) {
    const accounts = new Set<string>();
    for (const statement of statements) {
      for (const account of _.keys(statement[key])) {
        accounts.add(account);
      }
    }
    return Array.from(accounts).sort();
  }

  onDestroy(() => {
    stopResize?.();
  });

  onMount(async () => {
    try {
      ({ yearly } = await ajax("/api/income_statement"));
      const y = _.minBy(_.values(yearly), (y) => y.date);
      if (y) {
        dateMin.set(y.date);
      }

      const rawGroups: AccountGroup[] = [
        {
          key: "income",
          accounts: uniqueAccounts(_.values(yearly), "income"),
          label: "Income",
          multiplier: -1,
        },
        {
          key: "tax",
          accounts: uniqueAccounts(_.values(yearly), "tax"),
          label: "Tax",
          multiplier: -1,
        },
        {
          key: "interest",
          accounts: uniqueAccounts(_.values(yearly), "interest"),
          label: "Interest",
          multiplier: -1,
        },
        {
          key: "pnl",
          accounts: uniqueAccounts(_.values(yearly), "pnl"),
          label: "Gain / Loss",
          multiplier: 1,
        },
        {
          key: "equity",
          accounts: uniqueAccounts(_.values(yearly), "equity"),
          label: "Equity",
          multiplier: -1,
        },
        {
          key: "liabilities",
          accounts: uniqueAccounts(_.values(yearly), "liabilities"),
          label: "Liabilities",
          multiplier: -1,
        },
        {
          key: "expenses",
          accounts: uniqueAccounts(_.values(yearly), "expenses"),
          label: "Expenses",
          multiplier: -1,
        },
      ];
      accountGroups = rawGroups.filter(
        (g) =>
          g.accounts.length > 0 ||
          _.some(_.values(yearly), (y) => y[g.key] && Math.abs(sum(y[g.key])) > 0),
      );

      isLoading = false;
      await tick();
      renderer = renderIncomeStatement(svg);
      if (svg?.parentElement) {
        stopResize = observeElementSize(svg.parentElement, () => {
          svg.replaceChildren();
          renderer = renderIncomeStatement(svg);
          if (incomeStatement) {
            renderer(incomeStatement);
          }
        });
      }
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
      <ChartFrame type="distribution" size="dynamic" preserveChildren>
        <svg bind:this={svg} style="width: 100%; display: block; overflow: visible;" />
      </ChartFrame>
    {/if}
  </Section>

  <Section
    title="Detailed Statement"
    subtitle="Multi-year account comparison"
  >
    <div class="max-h-[calc(100vh-440px)] min-h-[260px] max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]">
      {#if isLoading}
        <div class="flex flex-col gap-[var(--paisa-space-2)] p-[var(--paisa-space-4)]" aria-hidden="true">
          {#each Array(8) as _}
            <div class="h-5 animate-pulse rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-hover)]"></div>
          {/each}
        </div>
      {:else}
        <table class="mb-0 w-full border-separate border-spacing-0 text-sm text-[var(--paisa-text-primary)]">
          <thead>
            <tr>
              <th class="sticky left-0 top-0 z-[6] bg-[var(--paisa-table-header-bg)] py-2 text-left font-semibold text-[var(--paisa-table-header-text)]">
                Account
              </th>
              {#each years as y}
                <th class="sticky top-0 z-[5] bg-[var(--paisa-table-header-bg)] py-2 text-right font-semibold tabular-nums text-[var(--paisa-table-header-text)]">
                  {y}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each accountGroups as group}
              <tr class="bg-[var(--paisa-surface-hover)]">
                <th class="border-b border-t border-[var(--paisa-border-default)] bg-[var(--paisa-surface-hover)] px-2 py-2 text-left font-bold text-[var(--paisa-brand-primary)]">
                  {group.label}
                </th>
                {#each years as y}
                  <td class="border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-hover)] px-2 py-2 text-right font-bold tabular-nums text-[var(--paisa-brand-primary)]">
                    {#if yearly[y]?.[group.key]}
                      {formatUnlessZero(sum(yearly[y][group.key]) * group.multiplier)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#each group.accounts as account}
                <tr>
                  <th class="custom-icon sticky left-0 z-[1] whitespace-nowrap bg-[var(--paisa-surface)] px-2 py-1 text-left text-xs font-normal text-[var(--paisa-text-secondary)]">
                    <span class="pl-4">
                      {iconify(restName(account), { group: firstName(account) })}
                    </span>
                  </th>
                  {#each years as y}
                    <td class="whitespace-nowrap px-2 py-1 text-right text-xs tabular-nums text-[var(--paisa-text-secondary)]">
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
              <th class="sticky left-0 bg-[var(--paisa-surface-default)] px-2 py-2 text-left font-bold">Change</th>
              {#each years as y}
                {#if yearly[y]}
                  {@const yearDiff = yearly[y].endingBalance - yearly[y].startingBalance}
                  <td class="px-2 py-2 text-right font-bold tabular-nums {changeClass(yearDiff)}">
                    <div>{formatCurrency(yearDiff)}</div>
                    <div class="text-xs">{formatPercentage(yearDiff / yearly[y].startingBalance)}</div>
                  </td>
                {:else}
                  <td></td>
                {/if}
              {/each}
            </tr>
            <tr class="bg-[var(--paisa-surface-default)]">
              <th class="sticky left-0 bg-[var(--paisa-surface-default)] px-2 py-2 text-left font-bold">End Balance</th>
              {#each years as y}
                <td class="px-2 py-2 text-right font-bold tabular-nums">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].endingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
            <tr class="bg-[var(--paisa-surface-default)]">
              <th class="sticky left-0 bg-[var(--paisa-surface-default)] px-2 py-2 text-left font-bold">Start Balance</th>
              {#each years as y}
                <td class="px-2 py-2 text-right font-bold tabular-nums">
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
