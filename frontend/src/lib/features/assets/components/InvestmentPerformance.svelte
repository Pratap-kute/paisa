<script lang="ts">
import { page } from "$app/state";
import { goto } from "$app/navigation";
import { api, type DtoInvestmentPerformance } from "$lib/api";
import { obscure } from "$lib/shared/state/persisted";
import { formatCurrency } from "$lib/shared/formatters/currency";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import Select from "$lib/shared/ui/Select.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import {
  performanceDecomposition,
  performanceLink,
  performancePercent,
  performancePresets,
  performanceQuery,
  performanceReason,
  performanceSeries,
} from "$lib/features/assets/performance";

let { account = "" }: { account?: string } = $props();
let result: DtoInvestmentPerformance | undefined = $state();
let loading = $state(true);
let failed = $state(false);
let retry = $state(0);
const selection = $derived(
  page.url.searchParams.has("from") || page.url.searchParams.has("to")
    ? "custom"
    : page.url.searchParams.get("preset") ?? "current_fy",
);
const options = $derived(
  selection === "custom"
    ? [...performancePresets, {
      value: "custom",
      label: "Custom period",
      disabled: true,
    }]
    : performancePresets,
);
const chart = $derived(
  result ? performanceSeries(result, $obscure) : undefined,
);
const decomposition = $derived.by(() => {
  $obscure;
  return result ? performanceDecomposition(result) : [];
});
const driverGroups = $derived([
  {
    label: "Positive Return Drivers",
    rows: (result?.drivers ?? []).filter((d) => (d.returnAmount ?? 0) > 0).sort(
      (a, b) => (b.returnAmount ?? 0) - (a.returnAmount ?? 0),
    ),
  },
  {
    label: "Negative Return Drivers",
    rows: (result?.drivers ?? []).filter((d) => (d.returnAmount ?? 0) < 0).sort(
      (a, b) => (a.returnAmount ?? 0) - (b.returnAmount ?? 0),
    ),
  },
  {
    label: "Other Investment Accounts",
    rows: (result?.drivers ?? []).filter((d) => (d.returnAmount ?? 0) === 0),
  },
]);

$effect(() => {
  const query = performanceQuery(page.url.searchParams);
  const selectedAccount = account;
  retry;
  const controller = new AbortController();
  loading = true;
  failed = false;
  result = undefined;
  api.investment.getInvestmentPerformance({
    ...query,
    accountPrefix: selectedAccount || undefined,
    drivers: true,
    timeline: true,
  }, { signal: controller.signal })
    .then((value) => {
      if (!controller.signal.aborted) result = value;
    })
    .catch(() => {
      if (!controller.signal.aborted) failed = true;
    })
    .finally(() => {
      if (!controller.signal.aborted) loading = false;
    });
  return () => controller.abort();
});
function money(value = 0) {
  return formatCurrency($obscure ? 0 : value);
}
function percent(value: number | null | undefined) {
  return performancePercent(value == null ? value : $obscure ? 0 : value);
}
function selectPeriod(event: Event & { currentTarget: HTMLSelectElement }) {
  const url = new URL(page.url);
  url.searchParams.delete("from");
  url.searchParams.delete("to");
  url.searchParams.set("preset", event.currentTarget.value);
  void goto(`${url.pathname}${url.search}`, {
    noScroll: true,
    keepFocus: true,
  });
}
</script>

<Section title="Selected-period performance">
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <label for="investment-performance-period" class="text-sm text-muted-foreground">Period</label>
    <Select id="investment-performance-period" value={selection} {options} onchange={selectPeriod} />
    {#if result}<span class="text-sm text-muted-foreground">{result.startDate} → {result.endDate}</span>{/if}
  </div>
  {#if failed}
    <div role="alert" class="flex flex-wrap items-center gap-3"><p>Unable to load investment performance. Check the selected dates or retry.</p><Button onclick={() => retry++}>Retry</Button></div>
  {:else if !loading && result?.quality?.status === "unavailable"}
    <ZeroState item={[]}><p>No investment activity is available for this period.</p></ZeroState>
  {:else}
    <MetricStrip cols={4}>
      <Metric label="Ending Value" value={money(result?.closingValue ?? 0)} {loading} />
      <Metric label="Net Contribution" value={money(result?.netContribution ?? 0)} {loading} />
      <Metric label="Investment Return" value={money(result?.investmentReturn ?? 0)} status={(result?.investmentReturn ?? 0) < 0 ? "negative" : (result?.investmentReturn ?? 0) > 0 ? "positive" : undefined} {loading} />
      <Metric label="Period Return" value={percent(result?.periodReturn)} {loading} />
    </MetricStrip>
    {#if result?.returnUnavailableReason}<p role="status" class="mt-3 text-sm text-muted-foreground">{performanceReason(result.returnUnavailableReason)}</p>{/if}
    {#if result?.quality?.status === "partial"}<p class="mt-2 text-sm text-muted-foreground">Partial data · monetary results may be estimates.</p>{/if}
  {/if}
</Section>

{#if result && result.quality?.status !== "unavailable"}
  <Section title="Performance Decomposition"
  subtitle="Portfolio growth includes both money you supplied and investment returns.">
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {#each decomposition as row}<div class="min-w-0"><dt class="text-sm text-muted-foreground">{row.label}</dt><dd class="break-words text-lg font-semibold tabular-nums">{row.formatted}</dd></div>{/each}
    </dl>
  <p
    class="mt-4 text-sm text-muted-foreground">Portfolio Change: {money(result.portfolioChange ?? 0)} = Net Contribution: {money(result.netContribution ?? 0)} + Investment Return: {money(result.investmentReturn ?? 0)}</p>
  <p
    class="mt-2 text-sm text-muted-foreground">Since-inception XIRR (annualized, through today): {percent(result.sinceInceptionXirr)}. Period Return uses Modified Dietz and is not annualized.</p>
</Section>
  <Section title="Performance Timeline">
    <ChartFrame height="compact">{#if chart}<TimeSeriesChart data={chart} ariaLabel="Market value and opening value plus cumulative net contribution" testId="investment-performance-timeline" internalLegend />{/if}</ChartFrame>
    {#if result.timeline?.some((p) => p.quality?.status === "partial")}<p class="text-sm text-muted-foreground">Some chart valuations are estimates. Only opening and closing valuation quality affects Period Return.</p>{/if}
    <details class="mt-3 text-sm text-muted-foreground"><summary>Valuation sources</summary>
      {#each [{ label: "Opening", quotes: result.openingQuotes }, { label: "Closing", quotes: result.closingQuotes }] as boundary}
        <p class="mt-2">{boundary.label}: {(boundary.quotes ?? []).map((q) => `${q.commodity} · ${q.source} · ${q.date || "no quote"}`).join("; ") || "Currency balances; no market quote required"}</p>
      {/each}
    </details>
  </Section>
  {#each driverGroups as group}
    {#if group.rows.length}
      <Section title={group.label}>
  <ul class="divide-y divide-border-subtle">
          {#each group.rows as driver}
            <li class="grid min-w-0 grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <a class="min-w-0 truncate font-medium text-primary hover:underline" title={driver.account} href={performanceLink(driver.account ?? "", page.url.searchParams)}>{driver.account}</a>
              <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm tabular-nums">
                <span class:text-positive={(driver.returnAmount ?? 0) > 0} class:text-negative={(driver.returnAmount ?? 0) < 0}>Return: {money(driver.returnAmount ?? 0)}</span>
                <span title={driver.returnUnavailableReason ? performanceReason(driver.returnUnavailableReason) : "Cash-flow-adjusted period return"}>Period: {percent(driver.periodReturn)}</span>
                <span>Ending: {money(driver.closingValue ?? 0)}</span>
              </div>
            </li>
          {/each}
        </ul>
</Section>
    {/if}
  {/each}
{/if}
