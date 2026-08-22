# ECharts Wave 1 Time-Series Report

Checkpoint: `feat(charts): migrate time-series visualizations`

Branch: `ui/redesign`

Status: Wave 1 complete; stop for review before Wave 2.

## Scope Completed

Migrated production time/period-trend charts:

- Asset Net Worth trend: `/assets/networth`
- Asset Investment monthly and financial-year period charts:
  `/assets/investment`
- Income monthly and financial-year period charts: `/income`
- Liabilities Repayment monthly period chart: `/liabilities/repayment`
- Goal savings and retirement progress/investment timelines:
  `/more/goals/savings/[slug]`, `/more/goals/retirement/[slug]`
- Asset Gain account detail timeline: `/assets/gain/[slug]`

Only Wave 1 charts were migrated. D3 remains installed globally for deferred
chart families.

## Deferred Candidates

- Credit Card yearly spending: horizontal year comparison; Wave 2
  bar/comparison.
- Asset Allocation timeline: allocation/category composition; allocation wave.
- Expense monthly/yearly timelines: coupled to expense breakdown/calendar
  charts; later expense wave.
- Liability Interest overview/breakdown: multiple comparison and timeline
  surfaces; later liability/comparison wave.
- Asset Gain overview: account comparison/XIRR bars; Wave 2.
- Doctor, Harvest, Schedule AL, Income Statement, LegendCard, and other
  non-chart D3 DOM remain deferred.

## Architecture

Added a proven period-series contract and generic chart component:

- `frontend/src/lib/charts/echarts/period_series.ts`
- `frontend/src/lib/charts/time_series_data.ts`
- `frontend/src/lib/components/charts/TimeSeriesChart.svelte`

Domain wrappers preserve chart meaning:

- `NetworthTimelineChart`
- `MonthlyInvestmentChart`
- `YearlyInvestmentChart`
- `MonthlyIncomeChart`
- `YearlyIncomeChart`
- `YearlyIncomeValueChart`
- `RepaymentTimelineChart`
- `GoalProgressChart`
- `GoalInvestmentChart`
- `GainAccountTimelineChart`

The contract expresses ordered financial series, visual intent, period
granularity, legends, tooltip rows, and optional mark lines. It does not expose
D3 scale, path, margin, or axis mechanics.

## Financial Parity

Renderer-independent tests now cover:

- Net Worth: net worth, net investment, gain/loss timeline values.
- Investment: monthly and yearly credit/debit grouping with signs preserved.
- Income: monthly income groups, yearly income groups, net income values, and
  legend labels.
- Repayment: monthly account-grouped repayment totals.
- Goals: actual, forecast, milestone, and target investment output.
- Gain detail: balance, net investment, and gain/loss timeline values.

No backend, API, or financial calculation code was changed. Net worth, net
investment, gain/loss, XIRR, income/tax totals, investment totals, repayment
totals, goal projection math, account hierarchy, and date-period selection
remain outside the ECharts option builder.

## Removed D3 Implementations

Deleted migrated D3 modules:

- `frontend/src/lib/charts/networth.ts`
- `frontend/src/lib/charts/investment.ts`
- `frontend/src/lib/charts/income.ts`
- `frontend/src/lib/charts/repayment.ts`
- `frontend/src/lib/charts/savings.ts`

Removed migrated render functions from:

- `frontend/src/lib/domain/goals.ts`
- `frontend/src/lib/charts/gain.ts` (`renderAccountOverview` only; gain
  overview remains deferred)

Removed orphan D3 yearly-investment card CSS from
`frontend/src/lib/styles/integrations/d3.css`.

## Selectors And Readiness

Migrated visual/browser readiness uses Paisa-owned ECharts readiness markers:

`[data-testid='...'][data-chart-ready='true']`

Tests no longer assert canvas internals, zrender internals, or ECharts-generated
DOM for migrated Wave 1 charts.

## Visual Strategy

`ChartFrame` continues to own chart chrome, state, layout, and sizing. The
shared `EChartSurface` owns the rendering surface, resize observer, chart
resize, theme refresh, and readiness marker.

Tooltips use shared Paisa formatting wrappers. Axis labels use readable period
formats, including time-axis date labels on the gain and net-worth timelines.
Mobile charts rely on ECharts label density and the shared period-series
builder, with readable legends retained where existing route UX already used
external `LegendCard`.

## Validation

Passed:

- `deno task typecheck`
- `deno task lint`
- `deno task test:component`: 23 files, 37 tests
- `deno task test:core`: 14 files, 89 tests
- `deno task build`
- targeted E2E/smoke: 20/20
- affected visual matrix and smoke routes: 77/77 after intentional snapshot
  updates

Notes:

- `deno task test:core` hit the known sandbox-only Vitest fork-pool failure:
  `fd is not from BiPipe`. It passed outside the sandbox.
- The first visual run exposed raw timestamp labels on ECharts time axes. The
  shared period-series axis formatter now renders readable dates.
- Visual snapshots were updated only for changed chart-rendering output and
  affected mobile chart framing.

## Boundary Audit

Direct ECharts imports are limited to:

- `frontend/src/lib/charts/echarts/core.ts`
- `frontend/src/lib/charts/echarts/surface_lifecycle.ts`
- `frontend/src/lib/components/charts/EChartSurface.svelte`

No routes or business/domain components import `echarts`, `echarts/*`,
`EChartsOption`, `EChartsType`, or raw ECharts event types.

Remaining D3 imports are expected and deferred for later waves, including
allocation, credit cards, expense charts, liability interest, cash-flow monthly,
income statement, doctor, harvest, schedule AL, chart palette helpers, and
LegendCard.

## Complexity

Current diff summary after Wave 1:

- 41 changed files
- 189 insertions
- 2,487 deletions

This removes five legacy D3 chart modules plus migrated route-level chart
handles while adding one shared period-series builder, one generic
`TimeSeriesChart`, and small domain-specific wrappers.

## Explicit Confirmations

- Branch is `ui/redesign`.
- `master` was not touched.
- D3 remains installed globally.
- Only Wave 1 time-series charts were migrated.
- Route architecture, AppShell, navigation, `Page`, `PageHeader`,
  `MetricStrip`, `Section`, forms, and tables were not redesigned.
- Backend/API/calculation code was not changed.

Stop here for review before Wave 2.
