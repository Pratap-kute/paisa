<script lang="ts">
import { formatFloat } from "$lib/shared/formatters/currency";
import type { Legend } from "$lib/shared/charts/types";
import type { Networth } from "$lib/domain/assets";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { api } from "$lib/api";
import { last } from "es-toolkit";
import { onMount } from "svelte";
import {
  dateMax,
  dateMin,
  dateRange,
  dateRangeOption,
  setAllowedDateRange,
} from "../../../../store";
import DateRange from "$lib/shared/ui/DateRange.svelte";
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import NetworthTimelineChart from "$lib/features/assets/components/NetworthTimelineChart.svelte";
import { buildNetworthSeries } from "$lib/features/assets/time_series_data";
import { filter, map } from "$lib/shared/utils/collection";
import { page } from "$app/state";
import { validPeriod } from "$lib/shared/browser/period";
import dayjs from "dayjs";

let networth = $state(0);
let investment = $state(0);
let gain = $state(0);
let xirr = $state(0);
let isLoading = $state(true);
let points: Networth[] = $state([]);
let legends: Legend[] = $state([]);
const selectedPeriod = validPeriod(page.url.searchParams.get("period"));

let filteredPoints = $derived.by(() => {
  if (!selectedPeriod) {
    return filter(points, (p) =>
      p.date.isSameOrBefore($dateRange.to) &&
      p.date.isSameOrAfter($dateRange.from));
  }
  const start = dayjs(`${selectedPeriod}-01`).startOf("month");
  const end = start.endOf("month");
  const inPeriod = points.filter((p) =>
    p.date.isSameOrAfter(start) && p.date.isSameOrBefore(end)
  );
  const before = points.filter((p) => p.date.isBefore(start)).at(-1);
  return before ? [before, ...inPeriod] : inPeriod;
});

$effect(() => {
  legends = buildNetworthSeries(filteredPoints).legends ?? [];
});

onMount(async () => {
  try {
    const result = await api.networth.getNetworth();
    points = (result.networthTimeline as unknown as Networth[]) || [];
    setAllowedDateRange(map(points, (p) => p.date));

    const periodEnd = selectedPeriod
      ? dayjs(`${selectedPeriod}-01`).endOf("month")
      : undefined;
    const current = periodEnd
      ? last(points.filter((p) => p.date.isSameOrBefore(periodEnd)))
      : last(points);
    if (current) {
      networth = current.investmentAmount + current.gainAmount -
        current.withdrawalAmount;
      investment = current.investmentAmount - current.withdrawalAmount;
      gain = current.gainAmount;
    }
    xirr = result.xirr || 0;
  } finally {
    isLoading = false;
  }
});
</script>

<svelte:head>
  <title>Net Worth - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Net Worth"
    description="Track assets and investment growth over time"
  >
    {#snippet actions()}
      <div class="inline-flex items-center sm:hidden">
        <DateRange bind:value={$dateRangeOption} dateMin={$dateMin} dateMax={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  {#if selectedPeriod}
    <div class="mb-3 text-sm text-[var(--paisa-muted-foreground)]">
      Showing {dayjs(`${selectedPeriod}-01`).format("MMMM YYYY")} · <a href="/assets/networth" class="text-[var(--paisa-primary)]">Clear period filter</a>
    </div>
  {/if}

  <MetricStrip cols={selectedPeriod ? 3 : 4}>
    <Metric
      label="Net Worth"
      value={formatCurrency(networth)}
      loading={isLoading}
    />
    <Metric
      label="Net Investment"
      value={formatCurrency(investment)}
      loading={isLoading}
    />
    <Metric
      label="Gain / Loss"
      value={formatCurrency(gain)}
      status={gain >= 0 ? "positive" : "negative"}
      loading={isLoading}
    />
    {#if !selectedPeriod}
      <Metric label="XIRR" value={formatFloat(xirr)} loading={isLoading} />
    {/if}
  </MetricStrip>

  <Section
    title="Net Worth Trend"
    subtitle="Assets, liabilities, and investment performance over time"
    fill
  >
    {#if filteredPoints.length > 0}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}

    <ChartFrame
      height="tall"
      empty={!isLoading && filteredPoints.length === 0}
      emptyMessage="No net-worth activity in this period"
      preserveChildren
    >
      <NetworthTimelineChart points={filteredPoints} />
    </ChartFrame>
  </Section>
</Page>
