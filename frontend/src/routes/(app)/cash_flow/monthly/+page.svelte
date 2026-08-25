<script lang="ts">
  import { buildCashFlowSeries } from "$lib/charts/mixed_period_data";
  import { type CashFlow } from "$lib/core/utils";
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { dateMin, dateMax, dateRange, dateRangeOption, setAllowedDateRange } from "../../../../store";
  import LegendCard from "$lib/shared/ui/LegendCard.svelte";
  import DateRange from "$lib/shared/ui/DateRange.svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";
import { filter, map, some } from "$lib/shared/utils/collection";

  let cashFlows: CashFlow[] = $state([]);
  let isLoading = $state(true);

  let filteredCashFlows = $derived(
    filter(
      cashFlows,
      (c) => c.date.isSameOrBefore($dateRange.to) && c.date.isSameOrAfter($dateRange.from),
    ),
  );
  let hasFilteredCashFlows = $derived(
    some(filteredCashFlows, (c) =>
      c.income !== 0 ||
      c.expenses !== 0 ||
      c.liabilities !== 0 ||
      c.tax !== 0 ||
      c.investment !== 0 ||
      c.checking !== 0 ||
      c.balance !== 0
    ),
  );
  let cashFlowData = $derived(buildCashFlowSeries(filteredCashFlows));

  onMount(async () => {
    try {
      const res = await api.cashFlow.getCashFlow();
      cashFlows = (res.cash_flows as unknown as CashFlow[]) || [];
      setAllowedDateRange(map(cashFlows, (c) => c.date));
      isLoading = false;
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
      <div class="inline-flex items-center sm:hidden">
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
        <LegendCard legends={cashFlowData.legends ?? []} clazz="mb-3 paisa-overflow-x-auto" />
      {/if}
      <ChartFrame
        height="tall"
      >
        <TimeSeriesChart
          data={cashFlowData}
          ariaLabel="Monthly cash flow and checking balance"
          testId="monthly-cash-flow-echart"
        />
      </ChartFrame>
    {/if}
  </Section>
</Page>
