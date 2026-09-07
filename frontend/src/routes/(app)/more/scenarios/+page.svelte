<script lang="ts">
import {
  api,
  type DtoScenarioBaseline,
  type DtoScenarioRequest,
  type DtoScenarioResult,
} from "$lib/api";
import { normalizeApiError } from "$lib/api/errors";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import Select from "$lib/shared/ui/Select.svelte";
import Input from "$lib/shared/ui/Input.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import { obscure } from "$lib/shared/state/persisted";
import { formatCurrency } from "$lib/shared/formatters/currency";
import {
  qualityMessage,
  scenarioMessage,
  type ScenarioMetric,
  scenarioSeries,
} from "$lib/features/scenarios/scenario";

let baseline = $state<DtoScenarioBaseline>();
let result = $state<DtoScenarioResult>();
let baselineLoading = $state(true);
let evaluating = $state(false);
let error = $state("");
let baselineError = $state(false);
let retry = $state(0);
let horizon = $state(60);
const fields = [
  { key: "monthlyIncome", label: "Monthly Income" },
  { key: "monthlyExpenses", label: "Monthly Expenses" },
  { key: "monthlyInvestmentTransfer", label: "Monthly Investment Transfer" },
] as const;
type Field = typeof fields[number]["key"];
let inputs = $state<Record<Field, string>>({
  monthlyIncome: "",
  monthlyExpenses: "",
  monthlyInvestmentTransfer: "",
});
let annual = $state("0");
let overrideReturn = $state(false);
let scenarioReturn = $state("0");
let events = $state<
  { id: number; month: string; type: string; amount: string; label: string }[]
>([]);
let nextId = 0;
let metric = $state<ScenarioMetric>("netWorth");
const chart = $derived(
  result?.available ? scenarioSeries(result, metric, $obscure) : undefined,
);
const money = (value: number | null | undefined) =>
  value == null ? "Unavailable" : $obscure ? "••••" : formatCurrency(value);
const number = (value: string) =>
  value.trim() === "" ? undefined : Number(value);
function restore() {
  for (const f of fields) {
    inputs[f.key] = baseline?.[f.key]?.value == null
      ? ""
      : String(baseline[f.key]?.value);
  }
  horizon = 60;
  annual = "0";
  overrideReturn = false;
  scenarioReturn = "0";
  events = [];
}
$effect(() => {
  retry;
  const controller = new AbortController();
  baselineLoading = true;
  baselineError = false;
  api.scenario.getScenarioBaseline({}, { signal: controller.signal }).then(
    (value) => {
      if (!controller.signal.aborted) {
        baseline = value;
        if (
          inputs.monthlyIncome === "" && inputs.monthlyExpenses === "" &&
          inputs.monthlyInvestmentTransfer === ""
        ) {
          for (const f of fields) {
            inputs[f.key] = value[f.key]?.value == null
              ? ""
              : String(value[f.key]?.value);
          }
        }
      }
    },
  ).catch(() => {
    if (!controller.signal.aborted) baselineError = true;
  }).finally(() => {
    if (!controller.signal.aborted) baselineLoading = false;
  });
  return () => controller.abort();
});
$effect(() => {
  const snapshot = baseline;
  const request: DtoScenarioRequest = {
    horizonMonths: horizon,
    monthlyIncome: number(inputs.monthlyIncome),
    monthlyExpenses: number(inputs.monthlyExpenses),
    monthlyInvestmentTransfer: number(inputs.monthlyInvestmentTransfer),
    annualInvestmentReturn: number(annual) === undefined
      ? 0
      : Number(annual) / 100,
    scenarioAnnualInvestmentReturn: overrideReturn
      ? Number(scenarioReturn) / 100
      : undefined,
    oneTimeEvents: events.map((e) => ({
      month: e.month,
      type: e.type,
      amount: Number(e.amount),
      label: e.label,
    })),
  };
  retry;
  if (!snapshot) return;
  const controller = new AbortController();
  evaluating = true;
  error = "";
  result = undefined;
  const timeout = setTimeout(() => {
    if (
      [
        request.monthlyIncome,
        request.monthlyExpenses,
        request.monthlyInvestmentTransfer,
        request.annualInvestmentReturn,
        request.scenarioAnnualInvestmentReturn,
        ...(request.oneTimeEvents ?? []).map((e) => e.amount),
      ].some((v) => v != null && !Number.isFinite(v))
    ) {
      error = scenarioMessage("invalid_scenario");
      evaluating = false;
      return;
    }
    api.scenario.evaluateScenario(request, { signal: controller.signal }).then(
      (value) => {
        if (!controller.signal.aborted) result = value;
      },
    )
      .catch((cause) => {
        if (!controller.signal.aborted) {
          error = scenarioMessage(normalizeApiError(cause).code);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) evaluating = false;
      });
  }, 300);
  return () => {
    clearTimeout(timeout);
    controller.abort();
  };
});
const metrics = [
  {
    label: "Ending Net Worth",
    key: "endingNetWorth",
    delta: "endingNetWorthDelta",
  },
  {
    label: "Ending Investment Value",
    key: "endingInvestment",
    delta: "endingInvestmentDelta",
  },
  { label: "Ending Cash", key: "endingCash", delta: "endingCashDelta" },
  {
    label: "Lowest Cash Balance",
    key: "minimumCashBalance",
    delta: "minimumCashDelta",
  },
] as const;
</script>

<Page>
  <PageHeader title="What-if Scenarios" description="Test financial changes without modifying your ledger." />
  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="flex flex-wrap gap-2" aria-label="Projection horizon">
      {#each [12, 36, 60, 120] as months}<Button variant={horizon === months ? "primary" : "secondary"} onclick={() => horizon = months}>{months / 12}Y</Button>{/each}
    </div>
    <Button onclick={restore} disabled={baselineLoading}>Reset scenario</Button>
  </div>
  {#if baselineError}<div role="alert">Unable to load baseline. <Button onclick={() => retry++}>Retry</Button></div>{/if}
  <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
    <Section title="Scenario assumptions">
      {#if baseline}<p class="mb-3 text-sm text-muted-foreground">Amounts in {baseline.currency}. Baseline → Scenario.</p>{/if}
      <div class="space-y-5">
        {#each fields as field}
          <div>
            <label for={field.key} class="block text-sm font-medium">{field.label}</label>
            <p class="my-1 text-sm text-muted-foreground">Baseline: {baselineLoading ? "Loading…" : money(baseline?.[field.key]?.value)}</p>
            <Input id={field.key} type={$obscure ? "password" : "text"} value={$obscure ? "••••" : inputs[field.key]} disabled={baselineLoading || $obscure} oninput={(e) => inputs[field.key] = e.currentTarget.value} />
            {#if !$obscure && baseline?.[field.key]?.value != null && inputs[field.key] !== "" && Number.isFinite(Number(inputs[field.key])) && Number(inputs[field.key]) !== baseline?.[field.key]?.value}
              {@const delta = Number(inputs[field.key]) - (baseline?.[field.key]?.value ?? 0)}
              <p class:text-positive={field.key === "monthlyIncome" ? delta > 0 : field.key === "monthlyExpenses" && delta < 0} class:text-negative={field.key === "monthlyIncome" ? delta < 0 : field.key === "monthlyExpenses" && delta > 0} class="mt-1 text-sm">{money(baseline?.[field.key]?.value)} → {money(Number(inputs[field.key]))} ({delta > 0 ? "+" : ""}{money(delta)})</p>
            {/if}
          </div>
        {/each}
        <p class="text-sm text-muted-foreground">Positive transfers move cash to investments; negative transfers move investments to cash. Increasing investments reduces available cash by the same amount.</p>
        <div><label for="annual-return" class="block text-sm font-medium">Expected Annual Return (%) · shared</label><Input id="annual-return" value={annual} oninput={(e) => annual = e.currentTarget.value} /></div>
        <p class="text-sm text-muted-foreground">This is an assumption, not a prediction. Paisa does not infer future returns from historical investment performance.</p>
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={overrideReturn} />Use a different scenario return</label>
        {#if overrideReturn}<div><label for="scenario-return" class="block text-sm font-medium">Scenario Annual Return (%)</label><Input id="scenario-return" value={scenarioReturn} oninput={(e) => scenarioReturn = e.currentTarget.value} /></div>{/if}
        <div class="space-y-4">
          {#each events as event (event.id)}
            <fieldset class="min-w-0 space-y-2 border-t border-border pt-3">
              <legend class="text-sm font-medium">One-time event {events.indexOf(event) + 1}</legend>
              <label for={`month-${event.id}`} class="block text-sm">Month</label><Input id={`month-${event.id}`} type="month" bind:value={event.month} />
              <label for={`type-${event.id}`} class="block text-sm">Type</label><Select id={`type-${event.id}`} bind:value={event.type} fullwidth options={[{value: "cash_inflow", label: "Cash inflow"}, {value: "cash_outflow", label: "Cash expense"}, {value: "cash_to_investment", label: "Move cash to investments"}, {value: "investment_to_cash", label: "Move investments to cash"}]} />
              <label for={`amount-${event.id}`} class="block text-sm">Amount</label><Input id={`amount-${event.id}`} type={$obscure ? "password" : "text"} value={$obscure ? "••••" : event.amount} disabled={$obscure} oninput={(e) => event.amount = e.currentTarget.value} />
              <label for={`label-${event.id}`} class="block text-sm">Optional description</label><Input id={`label-${event.id}`} value={event.label} oninput={(e) => event.label = e.currentTarget.value} />
              <Button onclick={() => events = events.filter((e) => e.id !== event.id)}>Remove event</Button>
            </fieldset>
          {/each}
          <Button disabled={!baseline} onclick={() => events = [...events, { id: nextId++, month: baseline?.startDate?.slice(0, 7) ?? "", type: "cash_inflow", amount: "", label: "" }]}>+ Add one-time event</Button>
        </div>
      </div>
    </Section>
    <Section title="Impact">
      {#if error}<div role="alert" class="mb-4">{error} <Button onclick={() => retry++}>Retry</Button></div>{/if}
      {#if result && !result.available}<p role="status" class="mb-4 text-warning">Comparison unavailable. All recurring baseline assumptions and starting cash are required. Your manual assumptions are retained, but cannot supply a missing baseline.</p>{/if}
      {#if baselineLoading || evaluating}<p role="status" class="mb-3 text-sm text-muted-foreground">{baselineLoading ? "Loading baseline…" : "Evaluating scenario…"}</p>{/if}
      <div class="space-y-6">
        {#each metrics as item}
          <div class="border-b border-border pb-4">
            <h2 class="mb-2 text-sm font-medium">{item.label}</h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <Metric label="Baseline" value={result?.available ? money(result.baseline?.[item.key]) : "Unavailable"} loading={baselineLoading || evaluating} class="[&_.paisa4-metric-value]:text-xl" />
              <Metric label="Scenario" value={result?.available ? money(result.scenario?.[item.key]) : "Unavailable"} loading={baselineLoading || evaluating} class="[&_.paisa4-metric-value]:text-xl" />
            </div>
            {#if result?.available}<p class="mt-1 text-sm" class:text-positive={(result.impact?.[item.delta] ?? 0) > 0} class:text-negative={(result.impact?.[item.delta] ?? 0) < 0}>Difference: {money(result.impact?.[item.delta])}</p>{/if}
          </div>
        {/each}
      </div>
      {#if result?.available}
        <div role="status" class="mt-4 space-y-2 text-sm">
          {#each [{ label: "Baseline", projection: result.baseline }, { label: "Scenario", projection: result.scenario }] as item}
            <p class:text-warning={item.projection?.openingCashNegative || !!item.projection?.firstNegativeCashMonth}>
              {item.label}: {#if item.projection?.openingCashNegative}Opening cash is already negative. {/if}
              {#if item.projection?.firstNegativeCashMonth}Cash turns negative in {item.projection.firstNegativeCashMonth}.{:else if !item.projection?.openingCashNegative}Cash buffer remains non-negative.{/if}
              Lowest cash: {money(item.projection?.minimumCashBalance)}
            </p>
          {/each}
        </div>
      {/if}
      {#if baseline?.quality?.reasons?.length}<ul class="mt-4 space-y-2 text-sm text-muted-foreground">{#each baseline.quality.reasons as reason}<li>{qualityMessage(reason.code)}</li>{/each}</ul>{/if}
    </Section>
  </div>
  <Section title="Projection" class="mt-6">
    <div class="mb-4 flex items-center gap-3"><label for="projection-metric" class="text-sm">Show</label><Select id="projection-metric" bind:value={metric} options={[{value: "netWorth", label: "Net Worth"}, {value: "investment", label: "Investments"}, {value: "cash", label: "Cash"}]} /></div>
    {#if chart}<ChartFrame height="compact"><TimeSeriesChart data={chart} ariaLabel={$obscure ? "Baseline and scenario projection. Values hidden." : "Baseline dashed and scenario solid monthly projection"} testId="scenario-projection" internalLegend /></ChartFrame>{:else}<p class="text-sm text-muted-foreground">{evaluating || baselineLoading ? "Preparing comparison…" : "A complete baseline is required to display the comparison."}</p>{/if}
  </Section>
  <details class="paisa-section mt-6">
    <summary class="cursor-pointer font-medium">Projection assumptions</summary>
    <div class="mt-3 space-y-3 text-sm text-muted-foreground">
      {#each fields as field}<p>{field.label}: {baseline?.[field.key]?.source ?? "Loading"}; {baseline?.[field.key]?.sampleCount ?? "—"} completed months.</p>{/each}
      <p>Shared annual return: {annual}%. Scenario return: {overrideReturn ? scenarioReturn : annual}%. Horizon: {horizon} months.</p>
      <p>Opening cash: {money(baseline?.currentCash)}. Opening investments: {money(baseline?.currentInvestmentValue)}. Current net worth: {money(baseline?.currentNetWorth)}. Static component: {money(baseline?.staticNetWorthComponent)}.</p>
      <p>Snapshot: {baseline?.asOfDate ?? "Loading"}. Projection begins {baseline?.startDate ?? "next month"}. The remainder of the current month is omitted.</p>
      <p>Other assets and liabilities are held constant in this projection. Their net component may be negative.</p>
      <p>Each month: opening investment growth, income, expenses, external cash events, recurring investment transfer, one-time transfers, then closing balances. Investment contributions occur at month end.</p>
      <p>This is an illustrative deterministic projection based on the selected assumptions. It is not a prediction or investment advice.</p>
    </div>
  </details>
</Page>
