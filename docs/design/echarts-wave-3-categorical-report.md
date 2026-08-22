# ECharts Wave 3 Categorical Color And Legend Cleanup Report

Checkpoint: `refactor(charts): remove legacy categorical d3 integrations`

Branch: `ui/redesign`

Status: Wave 3 complete; stop for review before Wave 4.

## 1. Fresh Remaining-D3 Inventory

The post-Wave-2 source tree was re-audited rather than relying on the original
architecture audit. It contains no standalone flat categorical D3 chart that
can be migrated without crossing the Wave 4 or Wave 5 boundaries.

| File / production surface | Purpose | Class | Disposition |
|---|---|---|---|
| `charts/portfolio.ts`; Portfolio Analysis and Asset Gain detail | Category rows coupled to per-row commodity treemaps | B | Wave 4 hierarchy/treemap |
| `charts/allocation.ts`; Asset Allocation | Account partition/treemap views | B | Wave 4 hierarchy/treemap |
| `charts/expense/monthly.ts`; Monthly Expenses | Daily expense activity calendar | C | Wave 4 calendar/heatmap |
| `charts/expense/yearly.ts`; Yearly Expenses | Monthly expense activity calendar | C | Wave 4 calendar/heatmap |
| `charts/expense/monthly.ts`; Monthly Expenses | Filterable stacked category timeline | D | Later controlled mixed-chart wave |
| `charts/expense/yearly.ts`; Yearly Expenses | Filterable stacked category timeline | D | Later controlled mixed-chart wave |
| `charts/allocation.ts`; Asset Allocation | Allocation composition over time | D | Later controlled mixed-chart wave |
| `charts/cash_flow.ts`; Dashboard and Monthly Cash Flow | Mixed inflow/outflow bars, balance line, tax texture, and yearly D3 fallback | D | Wave 5 advanced/mixed; accepted ECharts yearly route remains active |
| `charts/liabilities/interest.ts`; Liability Interest | Overview, per-account stacks, and timelines | D | Later controlled liability/mixed wave |
| `charts/income_statement.ts`; Income Statement | Custom statement flow with arrows and axes | D | Wave 5 advanced/custom |
| `charts/doctor.ts`; Doctor | D3-generated diagnostic DOM | E | Svelte/native DOM cleanup |
| `charts/harvest.ts`; Tax Harvest | D3-generated cards, controls, and tables | E | Svelte/native DOM cleanup |
| `charts/schedule_al.ts`; Schedule AL | D3-generated table rows | E | Svelte/native DOM cleanup |
| `core/utils.ts` | D3 axis typing, color helpers, text truncation, and selection helpers | F | Final helper cleanup after consumers migrate |
| `state/app.svelte.ts` and `store.ts` | `d3.extent` date-range utility | F | Final utility cleanup |
| `theme/chartPalette.ts` | D3 ordinal/sequential palette compatibility | F | Preserve until remaining consumers migrate |
| expense route type imports | D3 ordinal types shared with unmigrated timelines/calendars | F | Remove with those renderers |

The orphaned `charts/recurring.ts` D3 renderer had no production or test
consumer and was deleted as dead code. The Cash Flow Recurring route is a
Svelte route and did not use this renderer.

Class A has **zero candidates**. Wave 2 already absorbed the valid flat
categorical comparison charts.

## 2. Portfolio Decision

Portfolio was deferred intact. Its apparent category bars are not independent:
the same renderer owns filtering, group colors, labels, resize, and commodity
treemaps attached to each row. Extracting only the bars would split one
financial question across two rendering lifecycles and flatten meaningful
holding hierarchy.

No portfolio route, grouping, calculation, or renderer changed in Wave 3.

## 3. Categorical Contract And Color Strategy

No new categorical chart component or generic chart-family contract was added.
Wave 2's `ComparisonDatum` already expresses the migrated category comparison
surfaces.

It now accepts an optional `categoryKey`. The internal ECharts option builder
normalizes and hashes that key into the active `PaisaChartTheme.seriesColors`
array. This gives stable category identity independent of input order while
keeping raw palettes and engine types out of routes and domain components.

Precedence is:

1. explicit datum `color` for semantic/domain meaning;
2. deterministic categorical color for `categoryKey`;
3. chart primary fallback.

Gain/loss, warning, target, and other status colors therefore remain semantic.
Expense categories use categorical identity and no longer call a one-item D3
ordinal scale that gave every independently-built category the same color.

Six light and dark `--paisa-chart-series-*` tokens were added to the existing
Paisa token layer. Theme changes continue to rebuild options through the shared
surface and read the live token values; charts are not disposed/recreated.

## 4. chartPalette Audit

`generateColorScheme` remains D3-backed for compatibility. Current consumers
include:

- unmigrated allocation, expense timeline/calendar, cash-flow, and portfolio
  routes;
- migrated time-series data adapters;
- ECharts Sankey data;
- comparison legends that must match unmigrated timelines.

Changing that callable ordinal contract now would affect both migrated and
unmigrated charts. Final engine-neutral palette removal is deferred until its
D3 consumers disappear. No dead palette export was found that could be removed
safely in this checkpoint.

## 5. Legend Result

`LegendCard` remains the single external Paisa legend component. Its D3 import,
Svelte action, selection, SVG append, and texture URL dependency were removed.

It now renders:

- line and square symbols with CSS;
- the tax hatch with a Paisa-owned diagonal CSS symbol;
- optional values as renderer-neutral text;
- interactive entries as accessible buttons with `aria-pressed`.

The `Legend` API now exposes only label, color, line/square shape, optional
solid/diagonal symbol, optional value, selected state, and a typed callback. It
does not expose a D3 scale, selector, texture object, ECharts event, or series
object.

The existing D3 `textures` object remains private to the unmigrated monthly
cash-flow renderer because that renderer still uses it inside the chart. No
ECharts legend duplicates a Paisa external legend in this checkpoint.

## 6. Tooltip, Visibility, And Drill-Down

No tooltip, visibility, or drill-down ownership changed. Migrated comparison
charts retain the shared confined ECharts tooltip and Paisa formatter behavior.
Existing external legend callbacks remain typed Paisa callbacks. No raw ECharts
event was introduced.

## 7. Financial Parity And Tests

Renderer-independent tests verify:

- expense category keys, totals, shares, and tooltip rows remain unchanged;
- normalized category keys map deterministically regardless of surrounding
  data order;
- empty labels receive a stable fallback identity;
- explicit semantic colors override categorical colors;
- current theme series colors feed rebuilt ECharts options;
- `LegendCard` renders line, square, hatch, values, callbacks, and exactly one
  selected interactive entry without D3.

No chart option builder performs new aggregation. Backend APIs, totals,
balances, XIRR, allocation, date selection, and other calculations are
unchanged.

## 8. Validation

Passed:

- `deno task typecheck`;
- `deno task lint`;
- `deno task test:component` — 24 files / 39 tests;
- `deno task test:core` — 15 files / 95 tests, rerun outside the sandbox after
  the known Vitest `fd is not from BiPipe` fork-pool failure;
- `deno task build`;
- affected visual/smoke/overflow matrix — 92/92 after reviewing and accepting
  the intended legend snapshots, then 92/92 clean;
- representative E2E/smoke/overflow — 28/28.

Reviewed visual routes covered desktop/mobile and light/dark variants for the
dashboard, allocation, portfolio analysis, gain detail, investment, net worth,
monthly/yearly cash flow and expenses, income, liability interest, and
repayment. The changed snapshots are dashboard mobile light/dark and monthly
cash-flow mobile dark, where the native hatch replaces the D3 SVG texture.

ECharts readiness remains Paisa-owned through `[data-testid][data-chart-ready="true"]`.
No Canvas or zrender internals are used by tests.

## 9. Complexity Change

Production source changes before this report total 187 insertions and 165
deletions, including formatting in touched option/adapter files. The functional
maintenance changes are smaller:

- 66 LOC orphaned D3 recurring renderer removed;
- D3 import/action and duplicated SVG texture rendering removed from
  `LegendCard`;
- 29 LOC deterministic theme resolver added;
- 12 token declarations added across light/dark themes;
- no new ECharts chart component and no new chart-family abstraction;
- one focused 52 LOC component test plus expanded core tests added.

The net production LOC is slightly positive because stable color behavior and
tests are now explicit, while the number of rendering concepts is lower:
`LegendCard` no longer needs D3, SVG mutation, a Svelte action, or a texture
object contract.

## 10. Exact D3 State After Wave 3

Production D3 imports remain in 17 files:

- chart renderers: allocation, cash flow, expense shared/monthly/yearly,
  portfolio, liability interest, income statement, Doctor, Tax Harvest, and
  Schedule AL;
- shared helpers: `core/utils.ts`, `state/app.svelte.ts`, `store.ts`, and
  `theme/chartPalette.ts`;
- monthly and yearly expense route type imports.

`d3`, `@types/d3`, `d3-sankey-circular`, `d3-path-arrows`, and `textures`
remain installed. `LegendCard` and the deleted recurring renderer no longer
contribute D3 imports.

Direct ECharts imports remain confined to the internal chart layer and
`EChartSurface`. Routes and domain/application components do not import
ECharts, ECharts option types, engine instances, or raw engine events.

## 11. Explicit Confirmations

- Branch remains `ui/redesign`.
- `master` is untouched.
- D3 remains installed globally.
- No Wave 4 work started.
- No financial calculation or backend code changed.
- Route architecture, AppShell, navigation, and chart layout ownership are
  unchanged.
- No ECharts imports leaked into routes or domain/application components.
- Stop here for review before Wave 4.
