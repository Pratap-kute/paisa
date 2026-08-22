# Final Visualization Checkpoint Report

Checkpoint: Final visualization migration (Checkpoint A)

Branch: `ui/redesign`

Status: complete; stop for review before Checkpoint B (D3 DOM to Svelte).

## Result

All remaining production D3 chart renderers have been replaced. Dashboard and
Monthly Cash Flow, monthly/yearly expense timelines, allocation composition,
Liability Interest, and Income Statement now use the shared Paisa ECharts
foundation. This checkpoint did not migrate Tax Harvest, Schedule AL, Doctor,
or remove D3 dependencies.

## Migrated Surfaces

| Surface | Replacement | Preserved financial output |
|---|---|---|
| Dashboard current cash flow | `TimeSeriesChart` mixed stacks and balance line | income/use buckets and checking balance |
| Monthly Cash Flow | `TimeSeriesChart` mixed stacks, tax decal, balance line | income, expenses, tax, investment, liabilities, checking |
| Monthly Expenses timeline | stacked bars and running-total line | selected categories, daily totals, cumulative total |
| Yearly Expenses timeline | stacked monthly bars | financial-year ordering and category totals |
| Allocation composition | percentage time series | security-type grouping and percentages |
| Liability Interest overview | `ComparisonBarChart` | APR, drawn, interest, balance, repaid |
| Liability Interest accounts | Svelte summary rows and `TimeSeriesChart` | account totals and drawn/repaid/balance/gain-loss timelines |
| Income Statement | standard ECharts waterfall | starting/ending balance and section/account deltas |

The accepted yearly Sankey D3 block was deleted as dead code. No custom
waterfall path or arrow geometry was recreated.

## Contracts and Boundaries

`mixed_period_data.ts`, `interest_data.ts`, and
`income_statement_data.ts` own renderer-independent transformations. ECharts
option mechanics remain under `lib/charts/echarts`; routes pass Paisa-owned
contracts only. Direct ECharts imports remain confined to chart components and
the internal ECharts layer.

`ChartFrame` still owns chart layout and states. `EChartSurface` remains the
single resize owner. Validation exposed an async initialization race where the
first observed dimensions could be discarded; the surface now caches and
replays that measurement after initialization. No route-level resize owner was
added.

## Parity and Interaction

Adapter tests cover period ordering, cash-flow buckets, tax identity, running
expense totals, allocation percentages, liability totals and timelines, and
waterfall section/account arithmetic. Financial aggregation remains outside
option builders. Existing selectable expense legends remain Paisa-owned;
tooltips use shared Paisa formatters and ECharts-confined positioning.

Income Statement uses transparent base bars plus positive/negative change bars.
The route now initializes the selected year from the latest available statement
key, fixing an empty initial visualization found during screenshot review.
Mobile waterfall labels use concise stage names while tooltips retain full
labels and account detail.

## Removed Legacy Surface

Deleted renderer files total **2,544 LOC**:

- `cash_flow.ts`: 640
- `allocation.ts`: 137
- expense monthly/yearly renderers: 586
- Liability Interest renderer: 805
- Income Statement renderer: 376

The new adapters and waterfall implementation total **647 LOC** before tests:

- `mixed_period_data.ts`: 255
- `interest_data.ts`: 155
- `income_statement_data.ts`: 80
- ECharts waterfall builder/component: 157

The three implementation commits contain 971 insertions and 2,973 deletions
overall, a net reduction of 2,002 lines. The old 226-line SVG geometry test was
also replaced by renderer-independent parity tests.

## Validation

Passed:

- `deno task typecheck`: 0 errors and 0 warnings
- `deno task lint`: 188 files
- `deno task test:component`: 24 files / 39 tests
- `deno task test:core`: 19 files / 104 tests
- `deno task build`
- focused mixed-period, interest, and waterfall adapter tests: 12/12
- affected visual/regression matrix: 55/55 after reviewed snapshot updates
- Income Statement focused visual matrix: 4/4 after the mobile-label fix

Reviewed screenshots include cash flow, expense timelines, allocation,
Liability Interest, and Income Statement in desktop/mobile and light/dark.
Readiness assertions use Paisa-owned test IDs with
`[data-chart-ready="true"]`; no Canvas or zrender internals are asserted.

## Remaining D3

There are **7 direct production `d3` imports** and **0 D3 chart renderers**:

- Checkpoint B DOM migration: `doctor.ts`, `harvest.ts`, `schedule_al.ts`.
- Checkpoint C utility cleanup: `store.ts`, `state/app.svelte.ts`,
  `core/utils.ts`, `theme/chartPalette.ts`.

`d3-sankey-circular`, `d3-path-arrows`, and `textures` have zero production
consumers. Their declarations/dependencies remain for the later dependency
decommission checkpoint. Renderer-only resize/SVG helpers, D3 CSS, stale IDs,
and package removal are likewise deferred to Checkpoints C/D.

## Boundary Confirmation

- Branch remains `ui/redesign`; `master` remains at `a059d4c` and untouched.
- Backend APIs and financial calculations are unchanged.
- Page, AppShell, navigation, forms, tables, and route composition are unchanged.
- No Checkpoint B DOM migration or dependency removal has started.
- D3 remains installed globally.
- No ECharts imports or raw ECharts types leaked into routes or domain/application components.

Stop here for review.
