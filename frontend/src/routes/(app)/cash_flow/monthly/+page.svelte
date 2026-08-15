<script lang="ts">
  import _ from "lodash";
  import { createMonthlyFlow, type MonthlyFlowChart } from "$lib/charts/cash_flow";
  import { ajax, type CashFlow, type Legend } from "$lib/core/utils";
  import { onMount, onDestroy } from "svelte";
  import { dateRange, setAllowedDateRange } from "../../../../store";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let legends: Legend[] = $state([]);
  let cashFlows: CashFlow[] = $state([]);
  let chart: MonthlyFlowChart | null = $state(null);

  let filteredCashFlows = $derived(
    _.filter(
      cashFlows,
      (c) => c.date.isSameOrBefore($dateRange.to) && c.date.isSameOrAfter($dateRange.from)
    )
  );

  $effect(() => {
    if (chart && !_.isEmpty(cashFlows)) {
      chart.update(filteredCashFlows);
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  onMount(async () => {
    ({ cash_flows: cashFlows } = await ajax("/api/cash_flow"));
    setAllowedDateRange(_.map(cashFlows, (c) => c.date));
    chart = createMonthlyFlow("#d3-monthly-cash-flow", {
      rotate: true,
      balance: _.last(cashFlows)?.balance || 0
    });
    legends = chart.legends;
    if (!_.isEmpty(cashFlows)) {
      chart.update(filteredCashFlows);
    }
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Cash Flow"
    description="Monthly cash movement and checking balance"
  />

  <Section>
    <ZeroState item={cashFlows}>
      <strong>Oops!</strong> You have not made any transactions.
    </ZeroState>

    <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />

    <ChartFrame
      type="timeline"
      onresize={(dim) => chart?.resize(dim)}
    >
      <svg
        class:is-not-visible={_.isEmpty(cashFlows)}
        id="d3-monthly-cash-flow"
        width="100%"
      />
    </ChartFrame>
  </Section>
</Page>
