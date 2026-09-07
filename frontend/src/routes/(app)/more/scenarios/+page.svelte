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
import BoxedTabs from "$lib/shared/ui/BoxedTabs.svelte";
import Select from "$lib/shared/ui/Select.svelte";
import Input from "$lib/shared/ui/Input.svelte";
import Skeleton from "$lib/shared/ui/Skeleton.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import { obscure } from "$lib/shared/state/persisted";
import { formatCurrency } from "$lib/shared/formatters/currency";
import {
  impactTone,
  scenarioInput,
  scenarioMessage,
  type ScenarioMetric,
  scenarioQuality,
  scenarioSeries,
  scenarioSource,
} from "$lib/features/scenarios/scenario";

let baseline = $state<DtoScenarioBaseline>();
let result = $state<DtoScenarioResult>();
let baselineLoading = $state(true);
let evaluating = $state(false);
let error = $state("");
let baselineError = $state(false);
let retry = $state(0);
let baselineRetry = $state(0);
let baselineReady = $state(false);
let retryable = $state(false);
let incomplete = $state(false);
let horizon = $state(60);
const horizonOptions = [
  { label: "1Y", value: 12 },
  { label: "3Y", value: 36 },
  { label: "5Y", value: 60 },
  { label: "10Y", value: 120 },
];
const fields = [
  { key: "monthlyIncome", label: "Monthly Income" },
  { key: "monthlyExpenses", label: "Monthly Expenses" },
  { key: "monthlyInvestmentTransfer", label: "Monthly Investment Transfer" },
] as const;
type Field = typeof fields[number]["key"];
let overrides = $state<Partial<Record<Field, string>>>({});
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
const inputValue = (field: Field) =>
  overrides[field] ??
    scenarioInput(baseline?.[field]?.value, USER_CONFIG.display_precision);
const changed = $derived(
  fields.some((f) => number(overrides[f.key] ?? "") !== undefined) ||
    events.length > 0 ||
    (overrideReturn && Number(scenarioReturn) !== Number(annual)),
);
const notices = $derived(scenarioQuality(baseline?.quality?.reasons));
function restore() {
  overrides = {};
  horizon = 60;
  annual = "0";
  overrideReturn = false;
  scenarioReturn = "0";
  events = [];
}
$effect(() => {
  baselineRetry;
  const controller = new AbortController();
  baselineLoading = true;
  baselineError = false;
  api.scenario.getScenarioBaseline({}, { signal: controller.signal }).then(
    (value) => {
      if (!controller.signal.aborted) {
        baseline = value;
        baselineReady = true;
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
  const ready = baselineReady;
  const unfinished = events.some((e) =>
    !e.month || !e.type || e.amount.trim() === ""
  );
  const request: DtoScenarioRequest = {
    horizonMonths: horizon,
    monthlyIncome: number(overrides.monthlyIncome ?? ""),
    monthlyExpenses: number(overrides.monthlyExpenses ?? ""),
    monthlyInvestmentTransfer: number(
      overrides.monthlyInvestmentTransfer ?? "",
    ),
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
  if (!ready) return;
  const controller = new AbortController();
  evaluating = !unfinished;
  incomplete = unfinished;
  retryable = false;
  error = "";
  result = undefined;
  if (unfinished) return () => controller.abort();
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
        if (!controller.signal.aborted) {
          result = value;
          baseline = value.snapshot;
        }
      },
    )
      .catch((cause) => {
        if (!controller.signal.aborted) {
          const failure = normalizeApiError(cause);
          error = scenarioMessage(failure.code);
          retryable = failure.status !== 400;
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

<Page width="analysis">
  <PageHeader title="What-if Scenarios" description="Test financial changes without modifying your ledger.">
    {#snippet actions()}
      <div class="flex items-center gap-2">
        <BoxedTabs options={horizonOptions} bind:value={horizon} />
        <Button variant="secondary" size="sm" onclick={restore} disabled={baselineLoading || !changed}>Reset</Button>
      </div>
    {/snippet}
  </PageHeader>

  {#if baselineError}
    <div role="alert" class="mb-4 flex items-center justify-between rounded-md border border-negative/30 bg-negative-subtle px-3 py-2 text-xs text-negative">
      <div class="flex items-center gap-2">
        <i class="fas fa-triangle-exclamation shrink-0" aria-hidden="true"></i>
        <span>Unable to load baseline assumptions.</span>
      </div>
      <Button size="sm" variant="secondary" onclick={() => baselineRetry++}>Retry</Button>
    </div>
  {/if}

  <div class="grid min-w-0 gap-6 lg:grid-cols-2">
    <Section title="Scenario assumptions" subtitle="Amounts in {baseline?.currency ?? ''}. Baseline → Scenario.">
      <div class="space-y-4">
        {#each fields as field}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-xs">
              <label for={field.key} class="font-medium text-foreground">{field.label}</label>
              <span class="text-muted-foreground tabular-nums">
                Baseline: <span class="text-foreground font-medium">{baselineLoading ? "…" : money(baseline?.[field.key]?.value)}</span>
              </span>
            </div>
            <Input
              id={field.key}
              type={$obscure ? "password" : "text"}
              inputmode="decimal"
              value={$obscure ? "••••" : inputValue(field.key)}
              disabled={baselineLoading || $obscure}
              oninput={(e) => overrides[field.key] = e.currentTarget.value}
            />
            {#if !$obscure && baseline?.[field.key]?.value != null && overrides[field.key] != null && overrides[field.key] !== "" && Number.isFinite(Number(overrides[field.key])) && Number(overrides[field.key]) !== baseline?.[field.key]?.value}
              {@const delta = Number(overrides[field.key]) - (baseline?.[field.key]?.value ?? 0)}
              <div class="flex items-center justify-between text-xs pt-0.5">
                <span class="text-muted-foreground">{money(baseline?.[field.key]?.value)} → {money(Number(overrides[field.key]))}</span>
                <span class="font-medium tabular-nums {field.key === 'monthlyIncome' ? (delta > 0 ? 'text-positive' : 'text-negative') : field.key === 'monthlyExpenses' ? (delta > 0 ? 'text-negative' : 'text-positive') : 'text-neutral'}">
                  {delta > 0 ? "+" : ""}{money(delta)}
                </span>
              </div>
            {/if}
          </div>
        {/each}

        <p class="text-xs text-muted-foreground leading-relaxed">
          Positive transfers move cash to investments; negative transfers move investments to cash. Increasing investments reduces available cash by the same amount.
        </p>

        <div class="space-y-1.5 pt-1">
          <div class="flex items-center justify-between text-xs">
            <label for="annual-return" class="font-medium text-foreground">Expected Annual Return (%)</label>
            <span class="text-muted-foreground">Deterministic rate</span>
          </div>
          <Input
            inputmode="decimal"
            id="annual-return"
            value={annual}
            oninput={(e) => annual = e.currentTarget.value}
          />
          <p class="text-[11px] text-muted-foreground">Planning assumption; not inferred from past investment returns.</p>
        </div>

        <div class="pt-1">
          <label class="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
            <input type="checkbox" bind:checked={overrideReturn} class="rounded border-border text-primary focus:ring-primary" />
            <span>Use separate scenario return rate</span>
          </label>
          {#if overrideReturn}
            <div class="mt-2 space-y-1 pl-5">
              <label for="scenario-return" class="block text-xs font-medium text-foreground">Scenario Annual Return (%)</label>
              <Input inputmode="decimal" id="scenario-return" value={scenarioReturn} oninput={(e) => scenarioReturn = e.currentTarget.value} />
            </div>
          {/if}
        </div>

        <div class="pt-3 border-t border-border space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">One-time Events</span>
              <p class="text-xs text-muted-foreground">Lump sums and capital transfers</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!baseline}
              onclick={() => events = [...events, { id: nextId++, month: baseline?.startDate?.slice(0, 7) ?? "", type: "cash_inflow", amount: "", label: "" }]}
            >
              + Add Event
            </Button>
          </div>
          {#if events.length === 0}
            <p class="text-xs text-muted-foreground italic">No one-time events configured.</p>
          {/if}
          <div class="space-y-3">
            {#each events as event (event.id)}
              <div class="rounded-lg border border-border bg-surface p-3 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-foreground">Event {events.indexOf(event) + 1}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    class="text-negative hover:bg-negative-subtle hover:text-negative -mr-1"
                    onclick={() => events = events.filter((e) => e.id !== event.id)}
                  >
                    <i class="fas fa-trash-can text-[10px] mr-1" aria-hidden="true"></i>
                    <span>Remove</span>
                  </Button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label for={`month-${event.id}`} class="block text-xs text-muted-foreground mb-1">Month</label>
                    <Input id={`month-${event.id}`} type="month" bind:value={event.month} size="sm" />
                  </div>
                  <div>
                    <label for={`type-${event.id}`} class="block text-xs text-muted-foreground mb-1">Type</label>
                    <Select
                      id={`type-${event.id}`}
                      bind:value={event.type}
                      fullwidth
                      size="sm"
                      options={[
                        { value: "cash_inflow", label: "Cash inflow" },
                        { value: "cash_outflow", label: "Cash expense" },
                        { value: "cash_to_investment", label: "Move cash to investments" },
                        { value: "investment_to_cash", label: "Move investments to cash" },
                      ]}
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label for={`amount-${event.id}`} class="block text-xs text-muted-foreground mb-1">Amount</label>
                    <Input
                      inputmode="decimal"
                      id={`amount-${event.id}`}
                      type={$obscure ? "password" : "text"}
                      value={$obscure ? "••••" : event.amount}
                      disabled={$obscure}
                      oninput={(e) => event.amount = e.currentTarget.value}
                      size="sm"
                    />
                  </div>
                  <div>
                    <label for={`label-${event.id}`} class="block text-xs text-muted-foreground mb-1">Description</label>
                    <Input
                      id={`label-${event.id}`}
                      value={event.label}
                      oninput={(e) => event.label = e.currentTarget.value}
                      placeholder="Optional note"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </Section>

    <Section title="Projected impact" subtitle="Projected outcome at {horizon / 12}Y horizon">
      {#if incomplete}
        <div class="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
          <i class="fas fa-circle-info shrink-0 text-muted-foreground" aria-hidden="true"></i>
          <span>Complete the event month, type, and amount to update the comparison.</span>
        </div>
      {/if}
      {#if result?.available && !changed}
        <div class="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
          <i class="fas fa-circle-info shrink-0 text-muted-foreground" aria-hidden="true"></i>
          <span>No scenario changes yet. Adjust an assumption on the left to compare it with the baseline.</span>
        </div>
      {/if}
      {#if baseline?.quality?.status === "partial"}
        <div class="mb-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning">
          <i class="fas fa-triangle-exclamation shrink-0" aria-hidden="true"></i>
          <span>Partial baseline · review the data notices below</span>
        </div>
      {/if}
      {#if error}
        <div role="alert" class="mb-4 flex items-center justify-between rounded-md border border-negative/30 bg-negative-subtle px-3 py-2 text-xs text-negative">
          <div class="flex items-center gap-2">
            <i class="fas fa-triangle-exclamation shrink-0" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
          {#if retryable}<Button size="sm" variant="secondary" onclick={() => retry++}>Retry</Button>{/if}
        </div>
      {/if}
      {#if result && !result.available}
        <div role="status" class="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning">
          <i class="fas fa-circle-info shrink-0 mt-0.5" aria-hidden="true"></i>
          <span>Comparison unavailable. All recurring baseline assumptions and starting cash are required. Your manual assumptions are retained, but cannot supply a missing baseline.</span>
        </div>
      {/if}
      {#if baselineLoading || evaluating}
        <div role="status" class="mb-3 text-xs text-muted-foreground animate-pulse">
          {baselineLoading ? "Loading baseline…" : "Evaluating scenario…"}
        </div>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {#each metrics as item}
          <div class="rounded-lg border border-border bg-surface p-3.5 flex flex-col justify-between min-h-[92px]">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{item.label}</div>
            <div class="mt-1.5">
              {#if baselineLoading || evaluating}
                <div class="space-y-1.5">
                  <Skeleton width="6.5rem" height="1.5rem" />
                  <Skeleton width="4.5rem" height="0.875rem" />
                </div>
              {:else if !result?.available}
                <div class="text-base font-semibold text-muted-foreground">Unavailable</div>
              {:else if !changed}
                <div class="text-lg font-semibold tabular-nums text-foreground">
                  {money(result.baseline?.[item.key])}
                </div>
                <div class="mt-0.5 text-xs text-muted-foreground">Baseline = Scenario</div>
              {:else}
                {@const delta = result.impact?.[item.delta]}
                {@const tone = impactTone(item.key, delta, result.scenario?.[item.key])}
                <div class="text-lg font-semibold tabular-nums text-foreground">
                  {money(result.scenario?.[item.key])}
                </div>
                <div class="mt-0.5 flex items-center justify-between text-xs">
                  <span class="text-muted-foreground">Base: {money(result.baseline?.[item.key])}</span>
                  <span class="font-medium tabular-nums {tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : tone === 'warning' ? 'text-warning' : 'text-neutral'}">
                    {delta != null && delta > 0 ? "+" : ""}{money(delta)}
                  </span>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if result?.available}
        <div class="mt-4 rounded-lg border border-border bg-surface-raised p-3 space-y-2">
          <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cash Buffer & Health</div>
          {#if !changed}
            <p class="text-xs text-muted-foreground {result.scenario?.openingCashNegative || !!result.scenario?.firstNegativeCashMonth ? 'text-warning' : ''}">
              {#if result.scenario?.openingCashNegative}Opening cash is negative. {:else if result.scenario?.firstNegativeCashMonth}Cash turns negative in {result.scenario.firstNegativeCashMonth}. {:else}Cash buffer remains non-negative throughout projection. {/if}
              Lowest cash: <span class="font-medium text-foreground tabular-nums">{money(result.scenario?.minimumCashBalance)}</span>
            </p>
          {:else}
            <div class="space-y-1.5 text-xs">
              <div class="flex items-center justify-between {result.baseline?.openingCashNegative || !!result.baseline?.firstNegativeCashMonth ? 'text-warning' : 'text-muted-foreground'}">
                <span>Baseline: {#if result.baseline?.openingCashNegative}Negative at opening{:else if result.baseline?.firstNegativeCashMonth}Negative in {result.baseline.firstNegativeCashMonth}{:else}Buffer non-negative{/if}</span>
                <span class="tabular-nums">Min: {money(result.baseline?.minimumCashBalance)}</span>
              </div>
              <div class="flex items-center justify-between {result.scenario?.openingCashNegative || !!result.scenario?.firstNegativeCashMonth ? 'text-warning' : 'text-foreground'} font-medium">
                <span>Scenario: {#if result.scenario?.openingCashNegative}Negative at opening{:else if result.scenario?.firstNegativeCashMonth}Negative in {result.scenario.firstNegativeCashMonth}{:else}Buffer non-negative{/if}</span>
                <span class="tabular-nums">Min: {money(result.scenario?.minimumCashBalance)}</span>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if notices.length}
        <div class="mt-4 rounded-lg border border-warning/20 bg-warning-subtle/30 p-3 space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-warning">
            <i class="fas fa-circle-info text-xs" aria-hidden="true"></i>
            <span>Data Notices</span>
          </div>
          <div class="space-y-1.5">
            {#each notices as notice}
              <div class="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0"></span>
                <span>{notice}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </Section>
  </div>

  <Section title="Projection" subtitle="Monthly trajectory comparison" class="mt-6">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <label for="projection-metric" class="text-xs font-medium text-muted-foreground">Metric:</label>
        <Select
          id="projection-metric"
          bind:value={metric}
          size="sm"
          class="w-36"
          options={[
            { value: "netWorth", label: "Net Worth" },
            { value: "investment", label: "Investments" },
            { value: "cash", label: "Cash" },
          ]}
        />
      </div>
      <div class="flex items-center gap-3 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block w-3.5 border-t border-dashed border-muted-foreground"></span>
          <span>Baseline</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block w-3.5 border-t-2 border-primary"></span>
          <span>Scenario</span>
        </span>
      </div>
    </div>
    {#if chart}
      <ChartFrame height="compact">
        <TimeSeriesChart
          data={chart}
          ariaLabel={$obscure ? "Baseline and scenario projection. Values hidden." : "Baseline dashed and scenario solid monthly projection"}
          testId="scenario-projection"
          internalLegend
        />
      </ChartFrame>
    {:else}
      <p class="text-xs text-muted-foreground py-8 text-center">
        {incomplete ? "Finish the event to display the updated comparison." : evaluating || baselineLoading ? "Preparing comparison…" : "A complete baseline is required to display the comparison."}
      </p>
    {/if}
  </Section>

  <details class="group rounded-lg border border-border bg-surface p-3.5 text-xs text-muted-foreground mt-6">
    <summary class="cursor-pointer font-medium text-foreground select-none flex items-center justify-between list-none [&::-webkit-details-marker]:hidden">
      <span>Projection assumptions & methodology</span>
      <span class="text-xs text-muted-foreground flex items-center gap-1.5 group-open:hidden">
        <span>Show details</span>
        <i class="fas fa-chevron-down text-[10px]" aria-hidden="true"></i>
      </span>
      <span class="text-xs text-muted-foreground hidden group-open:flex items-center gap-1.5">
        <span>Hide details</span>
        <i class="fas fa-chevron-up text-[10px]" aria-hidden="true"></i>
      </span>
    </summary>
    <div class="mt-3 pt-3 border-t border-border space-y-2 leading-relaxed">
      {#each fields as field}
        <p><strong class="text-foreground">{field.label}:</strong> {scenarioSource(baseline?.[field.key])}</p>
      {/each}
      <p><strong class="text-foreground">Returns & Horizon:</strong> Shared annual return: {annual}%. Scenario return: {overrideReturn ? scenarioReturn : annual}%. Horizon: {horizon} months ({horizon / 12} years).</p>
      <p><strong class="text-foreground">Opening Positions:</strong> Opening cash: {money(baseline?.currentCash)}. Opening investments: {money(baseline?.currentInvestmentValue)}. Current net worth: {money(baseline?.currentNetWorth)}. Static component: {money(baseline?.staticNetWorthComponent)}.</p>
      <p><strong class="text-foreground">Timing:</strong> Snapshot: {baseline?.asOfDate ?? "Loading"}. Projection begins {baseline?.startDate ?? "next month"}. The remainder of the current month is omitted.</p>
      <p><strong class="text-foreground">Methodology:</strong> Other assets and liabilities are held constant in this projection. Each month: opening investment growth, income, expenses, external cash events, recurring investment transfer, one-time transfers, then closing balances. Investment contributions occur at month end.</p>
      <p class="italic text-[11px] text-muted-foreground/80">This is an illustrative deterministic projection based on the selected assumptions. It is not a prediction or investment advice.</p>
    </div>
  </details>
</Page>
