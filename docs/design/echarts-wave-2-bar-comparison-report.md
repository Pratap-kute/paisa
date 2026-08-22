# ECharts Wave 2 Bar And Comparison Report

Checkpoint: `feat(charts): migrate bar and comparison visualizations`

Branch: `ui/redesign`

Status: Wave 2 complete; stop for review before Wave 3.

## 1. Migrated Visualizations

Wave 2 migrated the current bar/comparison surfaces that were proven by the
post-Wave-1 codebase:

- Dashboard monthly expense category breakdown.
- Monthly Expenses category breakdown.
- Yearly Expenses category breakdown.
- Credit Card Detail yearly spending comparison.
- Asset Gain overview account comparison.
- Asset Allocation target-vs-current comparison when targets are configured.
- Budget account progress micro-bars, implemented as Svelte/CSS instead of
  ECharts because they are inline progress indicators.

## 2. Deferred Candidates

- Monthly and Yearly expense timelines remain D3 because they are mixed
  stacked-period charts with category legend filtering and date/year selection.
- Expense calendars remain D3 and belong with calendar/heatmap work.
- Asset Allocation category/value/timeline charts remain D3 because they are
  hierarchy/treemap/timeline surfaces.
- Monthly/dashboard cash-flow remains D3 because it is a mixed cash-flow
  composition, not a simple comparison chart.
- Credit-card list/network views and non-chart D3 DOM helpers were not changed.

## 3. Shared Contract

Added a small comparison contract:

`ComparisonBarChartData -> ComparisonDatum -> buildComparisonBarOption -> ComparisonBarChart -> EChartSurface`

The contract expresses categorical financial comparison:

- label/key/value;
- optional target;
- optional secondary value;
- value format;
- tooltip rows;
- optional per-point color.

It does not expose scales, paths, axes, margins, D3 selections, ECharts option
types, or raw ECharts events to routes.

## 4. Domain And Financial Parity

Renderer-independent adapters were added in `bar_comparison_data.ts`.

Tests verify:

- expense category totals and share percentages;
- credit-card yearly totals and month breakdown rows;
- allocation target/current/diff values;
- gain overview balance, investment, withdrawal, gain, and XIRR rows.

No backend, API contract, aggregation source, date-period selection, XIRR,
balances, budget calculations, credit-card bill calculations, or expense totals
were changed.

## 5. Route And UI Stability

Route structure, AppShell, navigation, Page, PageHeader, MetricStrip, Section
composition, forms, and tables were not redesigned.

Small chart-surface changes:

- migrated charts now use `[data-testid][data-chart-ready="true"]` readiness;
- Asset Allocation target-vs-current no longer uses the old target-side treemap
  in the target section; treemap/hierarchy allocation views remain elsewhere on
  the page for the later hierarchy wave;
- budget micro-bars use Svelte/CSS because ECharts would be oversized for an
  inline progress indicator.

## 6. Removed D3 Code

Removed:

- `credit_cards.ts`;
- `budget.ts`;
- `renderOverview` D3 implementation from `gain.ts`;
- `renderAllocationTarget` from `allocation.ts`;
- monthly/yearly `createCurrentExpensesBreakdown` and
  `renderCurrentExpensesBreakdown`.

D3 remains installed globally and is still used by deferred charts.

## 7. Visual And Selector Notes

Updated visual readiness for migrated ECharts charts:

- dashboard expense breakdown;
- monthly expense breakdown;
- credit-card yearly spends;
- asset gain overview.

Asset Allocation fixture data currently has no configured allocation targets, so
the migrated target chart is covered by adapter tests while route visual
readiness remains on the existing allocation category D3 chart.

Snapshots were intentionally updated for changed migrated surfaces.

## 8. Dependency Boundary

Direct ECharts imports remain limited to the internal chart layer and chart
wrapper components. Routes and business/domain components do not import
`echarts`, `echarts/*`, `EChartsOption`, `EChartsType`, or raw ECharts event
types.

Dependency direction remains:

`Route -> Domain/Application component -> Paisa Chart component -> Internal ECharts layer -> Apache ECharts`

## 9. Validation

Passed:

- `deno task typecheck`
- `deno task lint`
- `deno task test:component` — 23 files / 37 tests
- `deno task test:core` — 15 files / 93 tests, rerun outside sandbox because
  sandboxed Vitest fork pool hit the known `fd is not from BiPipe` issue
- `deno task build`
- targeted E2E/smoke/overflow: 22/22
- affected visual matrix: 53/53 after intentional snapshot updates, then
  verified clean without update flags

## 10. Complexity Result

Implementation added:

- `bar_comparison.ts`;
- `ComparisonBarChart.svelte`;
- `bar_comparison_data.ts`;
- `bar_comparison_data.test.ts`.

Net source change for this checkpoint is a reduction: `git diff --stat` before
the report showed 171 insertions and 1210 deletions across source, tests, and
snapshots. The biggest simplification is removing several one-off D3 renderers
and route-level resize/render handles in favor of one comparison adapter and the
existing `EChartSurface` lifecycle.

## 11. Explicit Confirmations

- Branch is `ui/redesign`.
- `master` was not touched.
- Only Wave 2 bar/comparison surfaces were migrated.
- D3 remains installed globally.
- Deferred D3 chart families remain intact.
- Calculations are unchanged.
- Route architecture is unchanged except for chart-surface replacement.
- Stop here before Wave 3.
