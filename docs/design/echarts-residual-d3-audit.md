# Post-Wave-4 Residual D3 Audit

Checkpoint: `docs(charts): audit remaining d3 after migration waves`

Branch: `ui/redesign`

Status: audit complete; stop for review before any remaining migration.

## Executive Result

The current post-Wave-4 tree has **13 direct `d3` imports in production
source**. Nine are renderer modules, two are application date-range utilities,
one is the shared utility module, and one is the shared chart palette.

There are **eight live D3 chart surfaces backed by six renderer families**:

1. Dashboard current cash flow.
2. Monthly Cash Flow.
3. Monthly Expenses timeline.
4. Yearly Expenses timeline.
5. Asset Allocation composition timeline.
6. Liability Interest overview.
7. Liability Interest per-account timelines.
8. Income Statement waterfall.

Three additional modules use D3 primarily for normal DOM construction: Tax
Harvest, Schedule AL, and Doctor. Tax Harvest also draws one small two-segment
unit bar that should become Svelte/CSS, not ECharts.

The accepted Cash Flow Yearly Sankey is not a remaining D3 chart. Its old D3
implementation is dead code still present in `cash_flow.ts`.

## Complete A-F Inventory

| File | Symbol / consumer | Class | Current responsibility | Replacement and dependency |
|---|---|---:|---|---|
| `lib/charts/cash_flow.ts` | `createMonthlyFlow`; Dashboard and Cash Flow Monthly | A | Mixed positive/negative stacked cash-flow bars, checking-balance line, tooltip, tax hatch, legend, responsive redraw | One typed ECharts mixed-period adapter/component; currently needs D3 scales, stack, axes, line, selection, transition, `textures`, resize helpers, and shared formatters |
| `lib/charts/cash_flow.ts` | `renderFlow`, `createFlow`, `name`; no consumer | F | Obsolete D3 circular Sankey retained after accepted ECharts replacement | Delete after audit approval; sole `d3-sankey-circular` consumer and one of two `d3-path-arrows` consumers |
| `lib/charts/expense/monthly.ts` | `renderMonthlyExpensesTimeline`; Monthly Expenses | A | Daily stacked category totals plus running-total step line and selectable external legend | ECharts period-series mixed stacked-bar/line component; D3 scale exposed as `z` must become engine-neutral category identity |
| `lib/charts/expense/yearly.ts` | `renderYearlyExpensesTimeline`; Yearly Expenses | A | Financial-year monthly stacked category totals and external legend | ECharts period-series stacked-bar component; remove D3-shaped `z` return |
| `lib/charts/allocation.ts` | `renderAllocationTimeline`; Asset Allocation | A | Security-type percentage composition over time | ECharts multi-series period chart; preserve percentages and existing grouping outside option builder |
| `lib/charts/liabilities/interest.ts` | `renderOverview`, chart handle; Liability Interest | A | Cross-account APR, drawn, interest, balance, and repaid comparison | Typed comparison chart/adapters; D3 scales, stacks, axes, tooltip hit areas, SVG sizing, resize helper |
| `lib/charts/liabilities/interest.ts` | `renderPerAccountOverview`, `renderOverviewSmall`; Liability Interest | A | Per-account summary table plus drawn/repaid/balance lines and gain/loss area | Svelte summary rows plus ECharts time-series chart per account; keep `timelineDomain` and parity helpers renderer-independent |
| `lib/charts/income_statement.ts` | `renderIncomeStatement`; Income Statement | A | Waterfall-style financial visualization from starting balance through income, tax, interest, P/L, equity, liabilities, expenses, and ending balance | ECharts waterfall/custom-bar representation using an independent transformation adapter; remaining `d3-path-arrows` consumer |
| `lib/charts/harvest.ts` | `renderHarvestables`; Tax Harvest | B | Imperative cards, calculator inputs, summary/detail tables; includes a two-segment units bar | Svelte cards/forms/tables and CSS progress bar; preserve `unitsRequiredFromGain` and `unitsRequiredFromAmount` as tested financial functions |
| `lib/charts/schedule_al.ts` | `renderBreakdowns`; Schedule AL | B | Mutates a table body and computes the displayed total | Native Svelte table rows and derived total; no chart library |
| `lib/charts/doctor.ts` | `renderIssues`; Doctor | B | Creates issue cards and status styling | Native Svelte keyed cards; no chart library |
| `store.ts` | `setAllowedDateRange` | C | `d3.extent` over Dayjs dates | Local typed min/max reduction shared with app state |
| `lib/state/app.svelte.ts` | `setAllowedDateRange` | C | Duplicate `d3.extent` over Dayjs dates | Same local typed min/max helper; assess old/new state duplication separately |
| `lib/core/utils.ts` | `darkenOrLighten` | C | `d3.rgb` parsing before chroma adjustment | Use the already-installed `chroma-js` color/luminance APIs |
| `lib/core/utils.ts` | `rainbowScale` | F | Unreferenced D3 linear/ordinal/rainbow helper | Delete |
| `lib/core/utils.ts` | `svgTruncate` | F | Unreferenced D3 selection/text measurement helper | Delete |
| `lib/core/utils.ts` | `skipTicks` | D | D3 axis tick-density callback used by four remaining chart modules | Remove with the final consumers; ECharts owns axis label interval |
| `lib/theme/chartPalette.ts` | `generateColorScheme` | D/C | D3 ordinal scale returned to remaining D3 and some migrated adapters | Keep until D3 chart APIs stop consuming scales, then return an engine-neutral resolver using existing deterministic series colors |
| `lib/charts/resize.ts` | `containerPlotSize` | D | D3 monthly cash-flow SVG sizing | Delete after cash-flow migration |
| `lib/charts/resize.ts` | `plotSize`, `createRedrawChart`, `ChartHandle` | D | D3 liability/cash-flow sizing and route-owned lifecycle | Delete chart-specific pieces after migrations; retain `Dimensions` and `observeElementSize` because ChartFrame/ECharts use them |
| `lib/charts/resize.ts` | `createClientWidthChart` | F | No consumer | Delete |
| `lib/charts/svg.ts` | `svgRectSpan` | D | Correct negative/positive SVG rect geometry in Liability Interest | Delete with interest renderer and its focused test |
| `styles/integrations/d3.css` | axis/arrow/text/harvest rules | E | Shared D3 SVG skin plus imperative Harvest styling | Delete/move rules as their final consumers migrate; details below |
| `routes/+layout.ts` | D3 CSS import | E | Loads residual D3 integration stylesheet | Delete only when stylesheet reaches zero |
| `app.d.ts` | `textures`, `d3-sankey-circular`, `d3-path-arrows` declarations | E | Untyped plugin shims | Delete with corresponding packages/imports |
| Browser/core tests | D3 IDs and SVG internals | E | Active readiness and renderer geometry assertions | Migrate alongside each production renderer to Paisa readiness or adapter tests |
| `lib/README.md` | “D3 renderers” wording | E | Stale architecture description | Update at final cleanup |

## Remaining Production Visualizations

| Surface | Financial question and transformation | D3 behavior | Difficulty |
|---|---|---|---:|
| Dashboard current cash flow | How current income sources fund expense, tax, investment, liability, and checking balance | Compact mixed stacks + balance line; tooltip; legend; resize | High |
| Monthly Cash Flow | How those cash-flow categories and checking balance change by month | Same renderer at full size; tax hatch; responsive labels | High |
| Monthly Expenses timeline | Daily spending by selected category and cumulative total | Diverging stack, step line, external selectable legend, tooltip | Medium |
| Yearly Expenses timeline | Monthly spending by category across the financial year | Diverging stack, external selectable legend, tooltip | Medium |
| Allocation composition timeline | How each security-type percentage changes over time | Multi-line percentage chart, external legend, resize redraw | Medium |
| Interest overview | Compare APR, drawn, interest, balance, and repayment across liabilities | Custom horizontal comparison, inline text, tooltip, wide overflow | High |
| Interest per-account breakdown | How drawn/repaid/balance and interest gain/loss evolve for each account | D3-built summary card plus one mixed line/area mini-chart per account | High |
| Income Statement | Explain the bridge from starting to ending net worth by financial section | Animated waterfall bars, connector arrows, labels, tooltips, account breakdown interaction | High |

No remaining production D3 network/flow chart exists. Cash Flow Yearly is
ECharts. The only advanced flow code is its obsolete D3 block.

## `cash_flow.ts` Re-audit

| Lines / symbols | Classification | Result |
|---|---|---|
| `MonthlyFlowChart`, `paddedDomain`, `createMonthlyFlow`, `renderMonthlyFlow` | Active adapter + D3 rendering | Used by Dashboard and Cash Flow Monthly; mixed stacked bars plus a balance line, not a simple time-series-only chart |
| CashFlow values and tooltip rows inside `render` | Domain-to-display mapping | Preserve income, expenses, liabilities, tax, investment, checking, and balance values exactly in a renderer-independent adapter |
| `renderFlow`, `createFlow`, `name` | Dead D3 rendering | Old yearly circular Sankey has zero consumers and can be deleted before migrating monthly cash flow |

The simplest monthly replacement is an intent-shaped mixed-period contract:
period buckets containing source stacks, use stacks, and checking balance. It
can reuse the ECharts surface/theme/formatters, but should not expose D3's two
band scales, stack tuples, texture object, or selector target.

## D3-as-DOM Findings

| Module | Is it a chart? | Financial logic to preserve | Approximate removable module LOC |
|---|---|---|---:|
| Tax Harvest | Mostly no. One simple two-segment units bar | Harvestable filtering, gain/amount/unit conversions, tax breakdown fields and ordering | 335 |
| Schedule AL | No; semantic tax table | Entry order, section fields, amount formatting, total sum | 33 |
| Doctor | No; issue/status cards | Issue order, level styling, summary, description, details | 52 |

Income Statement is **not** D3-as-DOM. It is a genuine waterfall visualization
with quantitative axes, positioned bars, transition connectors, and tooltip
breakdowns. It belongs in the narrow final visualization checkpoint.

## Shared Helper Dependency Graph

```text
core/utils.ts
  skipTicks -> cash_flow, expense/monthly, expense/yearly, liabilities/interest
  darkenOrLighten -> tests only (generic utility)
  rainbowScale -> dead
  svgTruncate -> dead

theme/chartPalette.ts
  generateColorScheme -> allocation and expense D3 charts
                      -> migrated time-series/bar/Sankey adapters
  D3 ordinal/sequential internals -> removable only after all callers accept
                                     an engine-neutral resolver

charts/resize.ts
  containerPlotSize -> cash_flow
  plotSize -> liabilities/interest
  createRedrawChart -> cash_flow dead Sankey + liabilities/interest
  ChartHandle -> liabilities route
  observeElementSize + Dimensions -> ChartFrame and EChartSurface (must remain)
  createClientWidthChart -> dead

charts/svg.ts
  svgRectSpan -> liabilities/interest -> svg.test.ts
```

`core/utils.ts` has one D3 import supporting four symbols; only `skipTicks`
still serves production charts. `chartPalette.ts` has one D3 import and remains
a compatibility boundary: migrated adapters still call `generateColorScheme`,
while remaining D3 charts require its ordinal-scale return type.

## CSS Audit

`styles/integrations/d3.css` is **220 LOC**, down from 422 LOC at the original
audit.

| Lines | Classification | Disposition |
|---|---|---|
| 5-73 | A: active D3 SVG/axis runtime, with a few generic selectors | Needed by remaining charts; delete or move genuinely generic font rules after migration |
| 74-87 | A/F: path-arrow styling | `g-arrow.is-light` is active for Income Statement; unqualified Sankey arrow use is dead |
| 89-108 | C: renderer-neutral LegendCard styling | Move to LegendCard/foundation when D3 CSS is retired |
| 110-136 | A/E: remaining SVG text helpers | Active in Income Statement, Interest, and status helper output; delete after those consumers change |
| 138-216 | B: Tax Harvest imperative DOM styling | Move beside the Svelte Harvest implementation, then remove D3-prefixed selectors |
| 218-220 | C: generic mono font utility | Move to foundation or replace with existing utility |

All 220 lines currently have either an active consumer or a required migration
destination. Approximately **160 LOC are truly D3-renderer styling**; about
**60 LOC are generic/Harvest styling that should move rather than disappear**.
The already removed 202 LOC represent obsolete Wave 1-4 selectors.

## Test and Selector Audit

Active browser selectors:

- `tests/browser/routes.ts`: `#d3-monthly-cash-flow` chart snapshot.
- `tests/browser/visual.spec.ts`: `#d3-current-cash-flow` dashboard assertion.
- `tests/browser/app.spec.ts`: `#d3-monthly-cash-flow` smoke assertion.

Active renderer-specific unit selectors:

- `tests/core/interest_chart.test.ts`: `#d3-interest-overview`, direct SVG
  groups, and `#d3-interest-timeline-breakdown` DOM geometry. These are valid
  tests for the current D3 implementation but must become adapter/lifecycle and
  Paisa-readiness tests during migration.

There are three D3-specific browser selector sites and eighteen selector/DOM
query sites in the Interest test file. The Sankey test's textual mention of D3
is an architectural assertion, not a selector artifact.

## Types and Dependencies

| Dependency | Remaining consumers | Removal condition |
|---|---|---|
| `d3` | 13 production imports listed above | Visualization, DOM, utility, palette, and helper cleanup complete |
| `@types/d3` | Type support for all direct D3 imports, especially scales/selections/stack points | Remove with `d3` after zero source imports |
| `d3-sankey-circular` | Dead `renderFlow` block only | No legitimate production consumer; delete dead block, declaration, dependency |
| `d3-path-arrows` | Dead Sankey block and live Income Statement waterfall connectors | Replace Income Statement and delete dead Sankey block |
| `textures` | Live Monthly Cash Flow tax hatch only | Replace with ECharts decal/CSS-token intent; CSS tax legend hatch already does not need it |

`app.d.ts` contains exactly three custom plugin declaration blocks for
`textures`, `d3-sankey-circular`, and `d3-path-arrows`. No custom declaration
for core D3 exists because `@types/d3` supplies it.

## Complexity Baseline

| Metric | Original audit | Current |
|---|---:|---:|
| Direct production `d3` import files | Not separately recorded | 13 |
| D3-importing chart/DOM modules | 20 historical chart modules | 9 |
| Live D3 renderer families | More than 15 | 6 |
| Live D3 chart surfaces | More than 20 | 8 |
| D3-importing chart/DOM module LOC | Part of 7,926 chart LOC | 2,964 total: 2,359 live charts, 420 DOM, about 185 dead Sankey |
| D3 helper LOC (`resize.ts`, `svg.ts`, test) | Included in 7,926 | 192, though most resize observation remains engine-neutral |
| D3 palette LOC | 497 | 497 |
| Shared utility LOC containing D3 | 1,270 | 1,271 |
| D3 integration CSS | 422 | 220 |
| D3-specific browser selector sites | At least 5 route families | 3 |
| D3 dependencies | 4 recorded | 5 including `textures` |

Using the original 7,926 LOC chart/helper baseline, only about 3,156 LOC now
belong to D3-importing chart/DOM modules plus their helper files. This is an
estimated **4,770 LOC reduction (about 60%)** in the legacy D3 chart/helper
surface. The current chart directory also contains the new typed ECharts
architecture, so total directory LOC is not a meaningful D3 metric.

## Exact Final Sequence

### Checkpoint A: Final visualization migration

Migrate the six actual renderer families, grouped into reviewable commits if
needed:

1. Mixed period charts: Dashboard/Monthly Cash Flow, monthly/yearly expense
   timelines, and allocation composition timeline.
2. Liability Interest overview and per-account mixed charts.
3. Income Statement waterfall.

Delete the obsolete yearly Sankey block at the start of this checkpoint. This
is a narrow final visualization checkpoint, so a Wave 5 is still needed, but it
must contain only these proven renderers.

### Checkpoint B: D3 DOM to Svelte

Rewrite Tax Harvest, Schedule AL, and Doctor as Svelte/native markup. Keep the
Tax Harvest calculator transformations independent and tested; implement its
small units indicator in CSS.

### Checkpoint C: Utility and helper cleanup

Replace the two `d3.extent` calls, `d3.rgb`, and palette scale boundary; delete
dead `rainbowScale`, `svgTruncate`, `createClientWidthChart`, and renderer-only
resize/SVG helpers while retaining shared `observeElementSize`/`Dimensions`.

### Checkpoint D: Dependency decommission

Reach zero production/test imports and D3 IDs, move the renderer-neutral CSS,
delete `d3.css` and its layout import, remove custom declarations, then remove
`d3`, `@types/d3`, `d3-sankey-circular`, `d3-path-arrows`, and `textures`.

## Blockers to D3 = 0

| Blocker | Responsibility | Checkpoint |
|---|---|---|
| `cash_flow.ts` live mixed chart and dead Sankey | Two live surfaces; obsolete plugin consumers | A |
| Monthly/yearly expense timelines | Two category-period surfaces | A |
| Allocation timeline | One percentage-composition surface | A |
| Liability Interest | Comparison and per-account surfaces plus mixed DOM | A |
| Income Statement | Waterfall visualization and final path-arrows consumer | A |
| Harvest, Schedule AL, Doctor | Imperative normal DOM | B |
| Store/state, utility, palette, resize/SVG helpers | Small utilities and D3-shaped compatibility APIs | C |
| CSS, selectors, declarations, dependencies | Integration artifacts | D |

After these checkpoints, the expected legacy removal is approximately 2,964
renderer/DOM LOC plus about 160 renderer CSS LOC and the D3-only portions of
shared helpers. Replacement LOC will be smaller typed adapters/components and
Svelte templates; financial transformations remain independently testable.

## Audit Boundary

- Branch remains `ui/redesign`; `master` remains at `a059d4c` and is untouched.
- This checkpoint changes documentation only.
- D3 dependencies remain unchanged.
- No financial calculation, route architecture, AppShell, navigation, form, or
  table implementation changed.
- No final visualization or D3-as-DOM migration has started.

Stop here for review.
