<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import _ from "lodash";
  import { renderIncomeStatement } from "$lib/charts/income_statement";
  import { observeElementSize } from "$lib/charts/resize";
  import {
    ajax,
    formatCurrency,
    formatPercentage,
    restName,
    type IncomeStatement,
    firstName
  } from "$lib/core/utils";
  import { dateMin, year } from "../../../../store";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import COLORS from "$lib/core/colors";
  import { iconify } from "$lib/core/icon";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";

  let isEmpty = $state(false);

  let svg: Element = $state();
  let incomeStatement: IncomeStatement = $state();
  let renderer: (data: IncomeStatement) => void = $state();
  let stopResize: (() => void) | undefined;
  let yearly: Record<string, IncomeStatement> = $state({});
  let diff: number = $state();
  let diffPercent: number = $state();
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
    if (value > 0) {
      return "has-text-success";
    } else if (value < 0) {
      return "has-text-danger";
    } else {
      return "has-text-grey";
    }
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
    ({ yearly } = await ajax("/api/income_statement"));
    const y = _.minBy(_.values(yearly), (y) => y.date);
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
    if (y) {
      dateMin.set(y.date);
    }

    const rawGroups: AccountGroup[] = [
      {
        key: "income",
        accounts: uniqueAccounts(_.values(yearly), "income"),
        label: "Income",
        multiplier: -1
      },
      {
        key: "tax",
        accounts: uniqueAccounts(_.values(yearly), "tax"),
        label: "Tax",
        multiplier: -1
      },
      {
        key: "interest",
        accounts: uniqueAccounts(_.values(yearly), "interest"),
        label: "Interest",
        multiplier: -1
      },
      {
        key: "pnl",
        accounts: uniqueAccounts(_.values(yearly), "pnl"),
        label: "Gain / Loss",
        multiplier: 1
      },
      {
        key: "equity",
        accounts: uniqueAccounts(_.values(yearly), "equity"),
        label: "Equity",
        multiplier: -1
      },
      {
        key: "liabilities",
        accounts: uniqueAccounts(_.values(yearly), "liabilities"),
        label: "Liabilities",
        multiplier: -1
      },
      {
        key: "expenses",
        accounts: uniqueAccounts(_.values(yearly), "expenses"),
        label: "Expenses",
        multiplier: -1
      }
    ];
    accountGroups = rawGroups.filter(
      (g) =>
        g.accounts.length > 0 ||
        _.some(_.values(yearly), (y) => y[g.key] && Math.abs(sum(y[g.key])) > 0)
    );
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Income Statement"
    description="Yearly profit and loss statement across all accounts"
  />

  {#if incomeStatement}
    <MetricStrip cols={4}>
      <LevelItem title="Selected Year" value={$year} />
      <LevelItem
        title="Starting Net Worth"
        value={formatCurrency(incomeStatement.startingBalance)}
      />
      <LevelItem
        title="Ending Net Worth"
        value={formatCurrency(incomeStatement.endingBalance)}
      />
      <LevelItem
        title="Net Change"
        value={formatCurrency(diff)}
        subtitle={formatPercentage(diffPercent, 2)}
        color={diff >= 0 ? COLORS.gainText : COLORS.lossText}
      />
    </MetricStrip>
  {/if}

  <Section title="Cash Flow Overview">
    <Card padding="md">
      {#if isEmpty}
        <ZeroState item={false}>
          <strong>Oops!</strong> You have not made any transactions for the selected year.
        </ZeroState>
      {:else}
        <div style="width: 100%; position: relative; min-height: 280px;">
          <svg bind:this={svg} style="width: 100%; display: block; overflow: visible;"></svg>
        </div>
      {/if}
    </Card>
  </Section>

  <Section title="Detailed Statement">
    <Card padding="none">
      <div class="paisa-overflow-x-auto" style="max-height: calc(100vh - 440px); min-height: 260px;">
        <table
          class="table is-narrow is-hoverable is-fullwidth has-sticky-header has-sticky-column mb-0"
        >
          <thead>
            <tr>
              <th class="py-2">Account</th>
              {#each years as y}
                <th class="py-2 has-text-right">{y}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each accountGroups as group}
              <tr class="has-text-weight-bold is-sub-header">
                <th>{group.label}</th>
                {#each years as y}
                  <td class="has-text-right">
                    {#if yearly[y]?.[group.key]}
                      {formatUnlessZero(sum(yearly[y][group.key]) * group.multiplier)}
                    {/if}
                  </td>
                {/each}
              </tr>
              {#each group.accounts as account}
                <tr class="is-account-row">
                  <th class="custom-icon paisa-nowrap"
                    ><span class="pl-4 has-text-weight-normal"
                      >{iconify(restName(account), { group: firstName(account) })}</span
                    ></th
                  >
                  {#each years as y}
                    <td class="has-text-right">
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
                  {@const diff = yearly[y].endingBalance - yearly[y].startingBalance}
                  <td class="has-text-right {changeClass(diff)}">
                    <div>{formatCurrency(diff)}</div>
                    <div class="is-size-7">{formatPercentage(diff / yearly[y].startingBalance)}</div>
                  </td>
                {:else}
                  <td></td>
                {/if}
              {/each}
            </tr>
            <tr class="has-text-weight-bold is-summary-row">
              <th>End Balance</th>
              {#each years as y}
                <td class="has-text-right">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].endingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
            <tr class="has-text-weight-bold is-summary-row">
              <th>Start Balance</th>
              {#each years as y}
                <td class="has-text-right">
                  {#if yearly[y]}
                    {formatCurrency(yearly[y].startingBalance)}
                  {/if}
                </td>
              {/each}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  </Section>
</Page>
