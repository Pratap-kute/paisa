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
const allDrivers = $derived(
  [...(result?.drivers ?? [])].sort(
    (a, b) => (b.returnAmount ?? 0) - (a.returnAmount ?? 0),
  ),
);

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
function periodUnavailableSummary(reason?: string | null) {
  switch (reason) {
    case "opening_balance_missing":
    case "closing_balance_missing":
    case "missing_market_quotes":
    case "insufficient_valuation_data":
      return "Opening or closing market price is missing";
    case "zero_capital_base":
    case "insufficient_weighted_capital":
      return "Capital base was zero or negative";
    case "unattributed_investment_income":
      return "Income attribution crosses scope";
    case "no_investment_activity":
      return "No activity in period";
    default:
      return "Return could not be calculated reliably";
  }
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

<section class="paisa-section mb-6">
  <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <label for="investment-performance-period" class="text-sm font-medium text-foreground">Period</label>
      <Select id="investment-performance-period" value={selection} {options} onchange={selectPeriod} />
      {#if result}<span class="text-sm text-muted-foreground">{result.startDate} → {result.endDate}</span>{/if}
    </div>
    {#if result?.quality}
      <div class="flex items-center gap-1.5 text-xs font-medium">
        {#if result.quality.status === "complete"}
          <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 bg-positive/10 text-positive">
            <i class="fas fa-check-circle text-[10px]" aria-hidden="true"></i>
            Complete
          </span>
        {:else if result.quality.status === "partial"}
          <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 bg-warning/10 text-warning" title="Some valuations are estimates">
            <i class="fas fa-exclamation-triangle text-[10px]" aria-hidden="true"></i>
            Partial · Estimates
          </span>
        {:else if result.quality.status === "unavailable"}
          <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 bg-neutral/10 text-muted-foreground">
            <i class="fas fa-circle-info text-[10px]" aria-hidden="true"></i>
            Unavailable
          </span>
        {/if}
      </div>
    {/if}
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
      {#if result?.periodReturn == null && !loading && result}
        <Metric
          label="Period Return"
          value="Unavailable"
          status="warning"
          secondary={periodUnavailableSummary(result.returnUnavailableReason)}
          {loading}
        />
      {:else}
        <Metric
          label="Period Return"
          value={percent(result?.periodReturn)}
          status={(result?.periodReturn ?? 0) > 0 ? "positive" : (result?.periodReturn ?? 0) < 0 ? "negative" : "neutral"}
          {loading}
        />
      {/if}
    </MetricStrip>
    {#if result?.returnUnavailableReason}
      <p role="status" class="sr-only">{performanceReason(result.returnUnavailableReason)}</p>
    {/if}
  {/if}
</section>

{#if result && result.quality?.status !== "unavailable"}
  <Section
    title="Performance Decomposition"
    subtitle="Portfolio growth includes both money you supplied and investment returns."
    class="[&_.paisa-section-title]:text-base [&_.paisa-section-title]:font-semibold [&_.paisa-section-title]:text-foreground [&_.paisa-section-title]:normal-case [&_.paisa-section-title]:tracking-normal"
  >
    <dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:grid-cols-5 border-b border-border-subtle pb-5">
      {#each decomposition as row}
        <div class="min-w-0">
          <dt class="text-xs font-medium text-muted-foreground">{row.label}</dt>
          <dd class="mt-1 break-words text-lg font-semibold tabular-nums text-foreground">{row.formatted}</dd>
        </div>
      {/each}
    </dl>
  </Section>

  <Section
  title="Performance Timeline"
  class="[&_.paisa-section-title]:text-base [&_.paisa-section-title]:font-semibold [&_.paisa-section-title]:text-foreground [&_.paisa-section-title]:normal-case [&_.paisa-section-title]:tracking-normal"
>
  <ChartFrame height="compact">
      {#if chart}
        <TimeSeriesChart
          data={chart}
          ariaLabel="Market value and opening value plus cumulative net contribution"
          testId="investment-performance-timeline"
          internalLegend
        />
      {/if}
    </ChartFrame>
</Section>

  {#if allDrivers.length}
    <Section
  title="Return Drivers"
  subtitle="Per-account performance contribution for the selected period"
  class="[&_.paisa-section-title]:text-base [&_.paisa-section-title]:font-semibold [&_.paisa-section-title]:text-foreground [&_.paisa-section-title]:normal-case [&_.paisa-section-title]:tracking-normal"
>
  <div
    class="overflow-hidden rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface">
    <div
      class="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_130px_110px_130px] items-center gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-surface-raised border-b border-border-subtle">
      <span>Account</span>
      <span class="text-right">Return</span>
      <span class="text-right">Return %</span>
      <span class="text-right">Ending Value</span>
    </div>
    <ul class="divide-y divide-border-subtle text-sm">
          {#each allDrivers as driver}
            <li class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_130px_110px_130px] items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-surface-hover/50 transition-colors">
              <div class="min-w-0 truncate">
                <a
                  class="font-medium text-primary hover:underline truncate block"
                  title={driver.account}
                  href={performanceLink(driver.account ?? "", page.url.searchParams)}
                >
                  {driver.account}
                </a>
              </div>
              <div class="flex items-center justify-between sm:justify-end text-right tabular-nums font-semibold" class:text-positive={(driver.returnAmount ?? 0) > 0} class:text-negative={(driver.returnAmount ?? 0) < 0}>
                <span class="sm:hidden text-xs font-normal text-muted-foreground">Return</span>
                <span>{(driver.returnAmount ?? 0) > 0 ? "+" : ""}{money(driver.returnAmount ?? 0)}</span>
              </div>
              <div class="flex items-center justify-between sm:justify-end text-right tabular-nums" class:text-positive={(driver.periodReturn ?? 0) > 0} class:text-negative={(driver.periodReturn ?? 0) < 0}>
                <span class="sm:hidden text-xs font-normal text-muted-foreground">Return %</span>
                {#if driver.periodReturn != null}
                  <span>{percent(driver.periodReturn)}</span>
                {:else}
                  <span class="text-xs text-muted-foreground" title={driver.returnUnavailableReason ? performanceReason(driver.returnUnavailableReason) : "Unavailable"}>
                    Unavailable
                  </span>
                {/if}
              </div>
              <div class="flex items-center justify-between sm:justify-end text-right tabular-nums text-foreground">
                <span class="sm:hidden text-xs font-normal text-muted-foreground">Ending Value</span>
                <span>{money(driver.closingValue ?? 0)}</span>
              </div>
            </li>
          {/each}
        </ul>
  </div>
</Section>
  {/if}

  <details
  class="mt-6 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface p-4 text-sm text-muted-foreground transition-colors">
  <summary
    class="cursor-pointer select-none font-medium text-foreground flex items-center justify-between">
    <span class="flex items-center gap-2">
      <i class="fas fa-shield-halved text-xs text-muted-foreground"
        aria-hidden="true"></i>
      <span>Valuation & data quality</span>
    </span>
    <span
      class="text-xs text-muted-foreground font-normal">Methodology, quote sources, and attribution</span>
  </summary>
  <div
    class="mt-4 pt-3 border-t border-border-subtle space-y-3 text-xs leading-relaxed">
      <div>
        <p class="font-medium text-foreground">Return Methodology</p>
        <p class="mt-0.5">Period Return uses Modified Dietz (money-weighted rate of return) to account for the timing and magnitude of external cash flows during the period. It is not annualized.</p>
        {#if result.sinceInceptionXirr != null}
          <p class="mt-1">Since-inception XIRR (annualized, through today): <strong class="text-foreground">{percent(result.sinceInceptionXirr)}</strong>.</p>
        {/if}
      </div>

      {#if result.quality?.reasons?.length}
        <div>
          <p class="font-medium text-foreground">Data Quality Notices</p>
          <ul class="list-disc pl-4 mt-0.5 space-y-0.5">
            {#each result.quality.reasons as reason}
              <li>{performanceReason(reason.code)}</li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if result.timeline?.some((p) => p.quality?.status === "partial")}
        <div>
          <p class="font-medium text-foreground">Timeline Estimates</p>
          <p class="mt-0.5">Some chart valuations are estimates. Only opening and closing valuation quality affects Period Return.</p>
        </div>
      {/if}

      <div>
        <p class="font-medium text-foreground">Valuation Sources</p>
        {#each [{ label: "Opening", quotes: result.openingQuotes }, { label: "Closing", quotes: result.closingQuotes }] as boundary}
          <p class="mt-1">
            <span class="font-medium text-foreground">{boundary.label}:</span>
            {(boundary.quotes ?? []).map((q) => `${q.commodity} · ${q.source} · ${q.date || "no quote"}`).join("; ") || "Currency balances; no market quote required"}
          </p>
        {/each}
      </div>
    </div>
</details>
{/if}
