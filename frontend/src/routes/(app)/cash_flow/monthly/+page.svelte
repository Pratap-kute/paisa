<script lang="ts">
  import _ from "lodash";
  import { createMonthlyFlow, type MonthlyFlowChart } from "$lib/charts/cash_flow";
  import { ajax, type CashFlow, type Legend } from "$lib/core/utils";
  import { onMount, onDestroy, tick } from "svelte";
  import { dateMin, dateMax, dateRange, dateRangeOption, setAllowedDateRange } from "../../../../store";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import DateRange from "$lib/components/ui/DateRange.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let legends: Legend[] = $state([]);
  let cashFlows: CashFlow[] = $state([]);
  let chart: MonthlyFlowChart | null = $state(null);
  let isLoading = $state(true);

  let filteredCashFlows = $derived(
    _.filter(
      cashFlows,
      (c) => c.date.isSameOrBefore($dateRange.to) && c.date.isSameOrAfter($dateRange.from),
    ),
  );
  let hasFilteredCashFlows = $derived(
    _.some(filteredCashFlows, (c) =>
      c.income !== 0 ||
      c.expenses !== 0 ||
      c.liabilities !== 0 ||
      c.tax !== 0 ||
      c.investment !== 0 ||
      c.checking !== 0 ||
      c.balance !== 0
    ),
  );

  $effect(() => {
    if (chart) {
      chart.update(filteredCashFlows);
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  onMount(async () => {
    try {
      ({ cash_flows: cashFlows } = await ajax("/api/cash_flow"));
      setAllowedDateRange(_.map(cashFlows, (c) => c.date));
      isLoading = false;
      await tick();
      chart = createMonthlyFlow("#d3-monthly-cash-flow", {
        rotate: true,
        balance: _.last(cashFlows)?.balance || 0,
      });
      legends = chart.legends;
      if (!_.isEmpty(cashFlows)) {
        chart.update(filteredCashFlows);
      }
    } catch {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Monthly Cash Flow - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Cash Flow"
    description="Monthly cash movement and checking balance"
  >
    {#snippet actions()}
      <div class="paisa-page-toolbar-mobile">
        <DateRange bind:value={$dateRangeOption} dateMin={$dateMin} dateMax={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  <Section
    title="Monthly Cash Flow"
    subtitle="Income, expenses, investment, tax, and checking balance"
  >
    {#if !isLoading && !hasFilteredCashFlows}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No cash-flow activity in this period.
        </p>
      </ZeroState>
    {:else}
      {#if !isLoading && hasFilteredCashFlows}
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      {/if}
      <ChartFrame
        type="timeline"
        size="dynamic"
        preserveChildren
        onresize={(dim) => chart?.resize(dim)}
      >
        <svg id="d3-monthly-cash-flow" width="100%" />
      </ChartFrame>
    {/if}
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
</style>
