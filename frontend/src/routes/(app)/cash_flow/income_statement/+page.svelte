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
      <div class="paisa-page-toolbar-mobile">
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
        class="paisa-metric-rate"
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
    <div class="paisa-statement-table-wrap">
      {#if isLoading}
        <div class="paisa-statement-loading" aria-hidden="true">
          {#each Array(8) as _}
            <div class="paisa-statement-loading-row"></div>
          {/each}
        </div>
      {:else}
        <table class="table is-narrow is-hoverable is-fullwidth has-sticky-header has-sticky-column mb-0 paisa-statement-table">
          <thead>
            <tr>
              <th class="py-2">Account</th>
              {#each years as y}
                <th class="py-2 has-text-right paisa-tabular-nums">{y}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each accountGroups as group}
              <tr class="has-text-weight-bold is-sub-header">
                <th>{group.label}</th>
                {#each years as y}
                  <td class="has-text-right paisa-tabular-nums">
                    {#if yearly[y]?.[group.key]}
                      {formatUnlessZero(sum(yearly[y][group.key]) * group.multiplier)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#each group.accounts as account}
                <tr class="is-account-row">
                  <th class="custom-icon paisa-nowrap">
                    <span class="pl-4 has-text-weight-normal">
                      {iconify(restName(account), { group: firstName(account) })}
                    </span>
                  </th>
                  {#each years as y}
                    <td class="has-text-right paisa-tabular-nums">
                      {#if yearly[y]?.[group.key]?.[account]}
                        {formatUnlessZero(yearly[y][group.key][account] * group.multiplier)}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            {/each}
          </tbody>
          <tfoot>
            <tr class="has-text-weight-bold is-summary-row is-summary-first">
              <th>Change</th>
              {#each years as y}
                {#if yearly[y]}
                  {@const yearDiff = yearly[y].endingBalance - yearly[y].startingBalance}
                  <td class="has-text-right paisa-tabular-nums {changeClass(yearDiff)}">
                    <div>{formatCurrency(yearDiff)}</div>
                    <div class="is-size-7">{formatPercentage(yearDiff / yearly[y].startingBalance)}</div>
                  </td>
                {:else}
                  <td></td>
                {/if}
              {/each}
            </tr>
            <tr class="has-text-weight-bold is-summary-row">
              <th>End Balance</th>
              {#each years as y}
                <td class="has-text-right paisa-tabular-nums">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].endingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
            <tr class="has-text-weight-bold is-summary-row">
              <th>Start Balance</th>
              {#each years as y}
                <td class="has-text-right paisa-tabular-nums">
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

<style lang="scss">
  .paisa-page-toolbar-mobile {
    display: inline-flex;
    align-items: center;

    @media screen and (min-width: 640px) {
      display: none;
    }
  }

  :global(.paisa-metric-rate .paisa4-metric-value) {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }

  :global(.paisa-metric-rate .paisa4-metric-meta) {
    white-space: normal;
  }

  .paisa-statement-table-wrap {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow: auto;
    max-height: calc(100vh - 440px);
    min-height: 260px;
  }

  :global(.paisa-tabular-nums) {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  :global(.paisa-statement-table td),
  :global(.paisa-statement-table th) {
    white-space: nowrap;
  }

  .paisa-statement-loading {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-4);
  }

  .paisa-statement-loading-row {
    height: 1.25rem;
    border-radius: var(--paisa-radius-sm);
    background: linear-gradient(
      90deg,
      var(--paisa-surface-hover) 25%,
      var(--paisa-surface) 50%,
      var(--paisa-surface-hover) 75%
    );
    background-size: 200% 100%;
    animation: paisa-shimmer 1.2s ease-in-out infinite;
  }

  @keyframes paisa-shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
</style>
