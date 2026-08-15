<script lang="ts">
  import {
    ajax,
    formatCurrency,
    formatFloat,
    type Legend,
    type Networth
  } from "$lib/core/utils";
  import { financialColors } from "$lib/theme/chartPalette";
  import { createNetworthChart, type NetworthChart } from "$lib/charts/networth";
  import _ from "lodash";
  import { onMount, onDestroy } from "svelte";
  import { dateRange, setAllowedDateRange } from "../../../../store";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let networth = $state(0);
  let investment = $state(0);
  let gain = $state(0);
  let xirr = $state(0);
  let svg: SVGElement = $state() as any;
  let chart: NetworthChart | null = $state(null);
  let points: Networth[] = $state([]);
  let legends: Legend[] = $state([]);

  let filteredPoints = $derived(
    _.filter(
      points,
      (p) => p.date.isSameOrBefore($dateRange.to) && p.date.isSameOrAfter($dateRange.from)
    )
  );

  $effect(() => {
    if (svg && !chart) {
      chart = createNetworthChart(svg);
      legends = chart.legends;
    }

    if (chart && !_.isEmpty(points)) {
      chart.update(filteredPoints);
    }
  });

  onDestroy(() => {
    chart?.destroy();
  });

  onMount(async () => {
    const result = await ajax("/api/networth");
    points = result.networthTimeline;
    setAllowedDateRange(_.map(points, (p) => p.date));

    const current = _.last(points);
    if (current) {
      networth = current.investmentAmount + current.gainAmount - current.withdrawalAmount;
      investment = current.investmentAmount - current.withdrawalAmount;
      gain = current.gainAmount;
    }
    xirr = result.xirr;
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Net Worth"
    description="Track assets and investment growth over time"
  />

  <MetricStrip cols={4}>
    <LevelItem title="Net worth" value={formatCurrency(networth)} />
    <LevelItem title="Net Investment" value={formatCurrency(investment)} />
    <LevelItem
      title="Gain / Loss"
      color={gain >= 0 ? financialColors.gainText : financialColors.lossText}
      value={formatCurrency(gain)}
    />
    <LevelItem title="XIRR" value={formatFloat(xirr)} />
  </MetricStrip>

  <Section>
    <ZeroState item={points}>
      <strong>Oops!</strong> You have no transactions.
    </ZeroState>

    <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />

    <ChartFrame
      type="timeline"
      onresize={(dim) => chart?.resize(dim)}
    >
      <svg id="d3-networth-timeline" width="100%" bind:this={svg} />
    </ChartFrame>
  </Section>
</Page>
