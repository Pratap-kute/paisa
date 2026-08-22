# D3 to Apache ECharts Architecture Audit

Checkpoint: `docs(charts): audit current d3 visualization architecture`

Branch: `ui/redesign`

Status: audit complete; stop for review before implementation.

## Starting Gate

This audit uses the current post-Phase-7 `ui/redesign` codebase as the source
of truth. Historical chart names, selectors, and dependencies were not assumed.

Confirmed before audit:

| Gate | Result | Evidence |
|---|---:|---|
| Branch | Pass | `git branch --show-current` -> `ui/redesign` |
| Bulma package | Pass | absent from `frontend/deno.json` |
| Sass package | Pass | absent from `frontend/deno.json` |
| SCSS app imports | Pass | Phase 7 audit records `frontend/src` SCSS removal |
| Tailwind Preflight | Pass | `foundation.css` imports `tailwindcss/preflight.css` |
| Production build | Pass | `deno task build` passed during audit |
| Typecheck | Pass | `deno task typecheck` passed during audit |

Phase 7 caveat: component-level `!important` usage is gone, but vendor
integration/compat CSS still contains documented `!important` rules. Do not
combine cleanup of those rules with the chart-engine migration unless a chart
surface requires a narrow adjustment.

## Current D3 Footprint

Direct D3-related dependencies in `frontend/deno.json`:

| Dependency | Use |
|---|---|
| `d3` | Core SVG selection, scales, axes, shapes, stack/layout helpers, color helpers |
| `@types/d3` | Type coverage for current D3 modules |
| `d3-sankey-circular` | Yearly cash-flow Sankey layout |
| `d3-path-arrows` | Arrowheads/flow direction on Sankey links |

Direct D3-related source/config files found by current-code grep:

| Area | Files |
|---|---|
| Chart modules | `allocation.ts`, `budget.ts`, `cash_flow.ts`, `credit_cards.ts`, `doctor.ts`, `expense.ts`, `expense/monthly.ts`, `expense/yearly.ts`, `gain.ts`, `harvest.ts`, `income.ts`, `income_statement.ts`, `investment.ts`, `liabilities/interest.ts`, `networth.ts`, `portfolio.ts`, `recurring.ts`, `repayment.ts`, `savings.ts`, `schedule_al.ts`, `svg.ts`, `resize.ts` |
| Domain/helpers | `domain/goals.ts`, `theme/chartPalette.ts`, `core/utils.ts`, `store.ts`, `state/app.svelte.ts`, `components/ui/LegendCard.svelte` |
| Integration/declarations | `routes/+layout.ts`, `styles/integrations/d3.css`, `app.d.ts`, `deno.json` |
| Route type imports | monthly/yearly expense pages, asset analysis/allocation pages |
| Tests | browser route/visual/app selectors and `tests/core/interest_chart.test.ts` |

Measured before migration:

| Metric | Current value |
|---|---:|
| `frontend/src/lib/charts` TS files, including tests/helpers | 23 |
| `frontend/src/lib/charts` LOC, including `resize.ts` and `svg.test.ts` | 7,926 |
| D3-heavy domain goal chart LOC | 493 |
| D3 palette/helper LOC | 497 |
| Shared utility LOC containing D3 axis/color/tooltip helpers | 1,270 |
| D3 integration CSS LOC | 422 |
| Total audited visualization/helper/CSS LOC sample | 9,688 |

The final report must compare these numbers against the ECharts foundation,
typed chart components, adapter/transformation files, remaining visualization
LOC, and remaining dependencies.

## Chart Inventory

| Route/component | Current implementation | Financial meaning | Current interaction/state | Proposed ECharts shape | Risk |
|---|---|---|---|---|---|
| Dashboard `/` | `cash_flow.createMonthlyFlow`, monthly expense breakdown | current cash flow, monthly expense category totals | resize via `ChartFrame`, tooltip, dashboard compact layout | `CashFlowSummaryChart`, `CategoryBreakdownChart` | High |
| Cash Flow Monthly | `createMonthlyFlow("#d3-monthly-cash-flow")` | monthly income/expense/tax/investment/liability aggregation | stacked positive/negative bars, line overlays, tooltip, legends | `MonthlyCashFlowChart` with typed monthly buckets | High |
| Cash Flow Yearly | `createFlow()` / `renderFlow` | annual cash-flow source-to-use graph | circular Sankey, path arrows, node/link labels | `CashFlowSankeyChart` using ECharts Sankey if parity is acceptable | Very high |
| Income Statement | `renderIncomeStatement(element)` | income statement rows and subtotals | custom table-like SVG/DOM rendering | likely not a chart; migrate to semantic component/table before D3 removal | Medium |
| Monthly Expenses | `renderMonthlyExpensesTimeline`, `renderCalendar`, breakdown | daily/monthly category aggregation | stacked timeline, calendar cells, category breakdown, legends | `ExpenseTimelineChart`, `ExpenseCalendarChart`, `CategoryBreakdownChart` | High |
| Yearly Expenses | yearly equivalents | month/year category aggregation | yearly timeline, month calendar, category breakdown | yearly variants of expense chart contracts | High |
| Asset Allocation | `renderAllocationTarget`, `renderAllocation`, `renderAllocationTimeline` | target vs actual allocation, category/value hierarchy, allocation timeline | bars, partition/treemap, legends, responsive re-render | `AllocationTargetChart`, `AllocationHierarchyChart`, `AllocationTimelineChart` | High |
| Asset Analysis | `renderPortfolioBreakdown` x4 | portfolio grouped by security type/rating/industry/name | treemap plus SVG labels, responsive callbacks | `PortfolioTreemapChart` with typed grouping | High |
| Asset Gain | `renderOverview` | realized/unrealized gain overview | stacked/area or timeline-style overview | `GainOverviewChart` | Medium |
| Asset Gain Detail | `renderAccountOverview`, `renderPortfolioBreakdown` x4 | account gain timeline, portfolio breakdowns | Delaunay-like hover risk if present, treemap reuse | `AccountGainTimelineChart`, `PortfolioTreemapChart` | High |
| Asset Net Worth | `createNetworthChart` | net worth and account/commodity positions | stacked areas, Delaunay hover, responsive chart handle | `NetWorthTimelineChart` with axis-pointer tooltip | High |
| Asset Investment | `renderMonthlyInvestmentTimeline`, `renderYearlyInvestmentTimeline`, `renderYearlyCards` | monthly/yearly investments, yearly cards | timelines plus DOM cards | `InvestmentTimelineChart`; cards may stay Svelte DOM | Medium |
| Income | `renderMonthlyInvestmentTimeline`, `renderYearlyIncomeTimeline`, `renderYearlyTimelineOf` | income, net income, net tax timelines | multi-chart resize handles and legends | `IncomeTimelineChart` variants | Medium |
| Budget card/component | `renderBudget(element, accountBudget)` | budget progress and consumption | compact embedded SVG in card | `BudgetProgressChart` or pure CSS/Svelte bar | Low |
| Expense Budget route | uses `BudgetCard` | budget status by account | card collection | migrate through `BudgetCard` only | Low |
| Credit Card Detail | `renderYearlySpends` | yearly spend totals for one card | bar/timeline inside detail page | `CreditCardYearlySpendChart` | Low |
| Liabilities Repayment | `renderMonthlyRepaymentTimeline` | debt repayment schedule aggregation | stacked timeline and legends | `RepaymentTimelineChart` | Medium |
| Liabilities Interest | `createInterestOverviewChart`, `createInterestPerAccountChart` | interest overview and per-account breakdown | existing component tests, timeline/table mix | `InterestOverviewChart`, `InterestPerAccountChart` | Medium-high |
| Goals Savings/Retirement Detail | `domain/goals.renderProgress`, `renderInvestmentTimeline` | goal forecast, target progress, investment projection | line/area progress, investment stacked bars, hover | `GoalProgressChart`, `GoalInvestmentTimelineChart` | High |
| Tax Harvest | `renderHarvestables` | harvestable gains/losses and tax estimate inputs | primarily DOM cards/tables with D3 selection | migrate to Svelte component, not ECharts unless chart found in review | Medium |
| Tax Schedule AL | `renderBreakdowns` | schedule AL asset/liability sections | table body mutation | migrate to Svelte table component | Low |
| Doctor | `renderIssues` | diagnosis issue grouping | DOM cards created by D3 selection | migrate to Svelte component | Low |
| Recurring | `renderRecurring` | recurring transaction sequence | D3 DOM/SVG helper | audit exact UI during migration wave | Low-medium |
| Savings chart module | `charts/savings.renderProgress` | savings progress | compact progress visualization | compare with `domain/goals` and consolidate | Medium |
| `LegendCard.svelte` | D3 selection for inline legend icon | legend color/symbol presentation | DOM/SVG micro-render | replace with Svelte/CSS/SVG-native component, no ECharts needed | Low |

## Non-Chart D3 Usage

These should not become ECharts APIs:

| File | Current D3 use | Replacement direction |
|---|---|---|
| `store.ts`, `state/app.svelte.ts` | `d3.extent` for date range | small local `extent` helper or native reduce |
| `theme/chartPalette.ts` | ordinal scales and interpolators | token/color utility returning arrays/maps; only keep if no D3 dependency |
| `core/utils.ts` | axis tick wrapper, rainbow scale, `rgb`, SVG text truncation selection | split chart-specific helpers into chart layer; replace color/extent utilities locally |
| `domain/goals.ts` | financial projections plus D3 renderers in one file | keep calculations, move rendering to typed chart components |
| `app.d.ts` | untyped D3 plugin declarations | delete after Sankey/path-arrow removal |

## Current D3 APIs and Patterns

The codebase currently exposes rendering-engine-shaped APIs:

| Pattern | Examples | Migration rule |
|---|---|---|
| CSS selector as render target | `renderPortfolioBreakdown("#d3-portfolio", data)`, `createMonthlyFlow("#d3-monthly-cash-flow", options)` | Replace with Svelte chart components receiving typed props |
| Imperative handles | `ChartHandle`, `resize(dim)`, `destroy()` | Keep lifecycle inside `EChartSurface`; routes should not own engine handles |
| Shared color scale types | `d3.ScaleOrdinal` passed through routes | Pass stable series/category keys and let chart layer map to tokens |
| D3-generated DOM tables/cards | tax harvest, schedule AL, doctor, income statement | Prefer Svelte DOM components, not ECharts |
| SVG ids as test readiness | `#d3-networth-timeline`, `#d3-current-month-breakdown` | Replace with semantic `data-testid` and chart-level role/label assertions |

Do not preserve D3-shaped APIs such as scales, path generators, margins, or
selector strings. The replacement contracts should express financial intent:
series, points, buckets, categories, grouped totals, value format, period, and
drill-down metadata.

## Hardest Chart Recommendation

The hardest spike should be the yearly cash-flow Sankey in
`frontend/src/lib/charts/cash_flow.ts`.

Reasons:

- It is the only current user of `d3-sankey-circular`.
- It is the only current user of `d3-path-arrows`.
- It carries financial flow semantics through node/link widths and labels.
- It has custom responsive geometry, label placement, link styling, and arrow
  direction.
- ECharts Sankey may not support circular flow parity exactly, so feasibility
  must be proven before the rest of the migration assumes D3 can disappear.

Spike rule: keep the working D3 implementation while proving the ECharts
version. Verify financial-information parity, interactions, drill-down if
present, responsiveness, light/dark, mobile, missing data, tooltips, and
performance. Commit and stop. Remove the old D3 implementation for that chart
only after approval.

Fallback if ECharts Sankey cannot preserve financial meaning: document the gap
and either keep a narrow D3 island temporarily with explicit approval, or change
the visualization form only through product review.

## ECharts Foundation Proposal

Add an internal chart layer with this dependency direction:

`Route -> Domain/Application component -> Paisa Chart component -> Internal ECharts layer -> Apache ECharts`

Proposed pieces:

| Piece | Responsibility |
|---|---|
| `ChartFrame` | Keep existing shell, title/actions, empty/loading/error state, layout, size classes |
| `EChartSurface.svelte` | SSR-safe ECharts init/dispose, option updates, theme update, event wiring, `ResizeObserver` integration |
| `charts/echarts/theme.ts` | convert Paisa CSS tokens and light/dark mode to ECharts theme/options |
| `charts/echarts/formatters.ts` | currency, percent, date, period, account/category label formatting |
| `charts/echarts/contracts.ts` | small typed contracts: time series, stacked periods, category breakdowns, hierarchy nodes, flow links |
| Paisa chart components | user-facing chart intent components such as `MonthlyCashFlowChart`, `NetWorthTimelineChart`, `PortfolioTreemapChart` |

Renderer choice for initial spike: Canvas, unless the Sankey spike or visual
regression proves SVG is required. Canvas matches ECharts defaults and should
reduce custom SVG/layout code. Any SVG renderer exception must be documented in
the spike.

Use modular ECharts imports only. The audit should be considered failed if
production route files or unrelated domain components import ECharts directly.

## Financial Parity Requirements

For every migrated visualization, identify:

- existing domain/chart input;
- existing financial values rendered;
- existing grouping/aggregation;
- equivalent transformation output passed to ECharts.

The migration must not alter:

- totals and balances;
- gain/loss and XIRR;
- category aggregation;
- cash-flow aggregation;
- tax calculations;
- account hierarchy;
- date-period selection.

Where practical, add renderer-independent tests for transformation builders.
For example, cash-flow Sankey should test node/link values before ECharts
options are created; expense timelines should test grouped period/category
totals; portfolio treemaps should test hierarchy totals and labels.

## Test and Selector Migration

Current D3-specific test selectors:

| Test area | Current selectors |
|---|---|
| Browser route readiness | `#d3-portfolio-security-type > g`, `#d3-networth-timeline g`, `#d3-yearly-expense-timeline g` |
| Browser visual readiness | `#d3-current-cash-flow`, `#d3-current-month-breakdown` |
| App smoke | `#d3-networth-timeline g`, `#d3-monthly-cash-flow` |
| Unit/component | `#d3-interest-overview`, `#d3-interest-timeline-breakdown` |

Migration direction:

- use `data-testid` on Paisa chart components, not engine-internal DOM;
- assert route readiness through chart component visibility plus stable labels;
- keep renderer-independent tests for transformation parity;
- use visual regression for final rendered fidelity.

## Controlled Migration Waves

After the Sankey spike is approved:

1. **Foundation**: add `EChartSurface`, theme bridge, typed contracts, and
   transformation test helpers.
2. **Wave 1 - time series**: net worth, income, investment, repayment, goal
   progress/investment, credit-card yearly spend.
3. **Wave 2 - bars/comparison**: expense/current breakdowns, gain overview,
   allocation target, budget progress.
4. **Wave 3 - categorical**: portfolio grouping and legend replacement.
5. **Wave 4 - calendar/hierarchy**: monthly/yearly expense calendars,
   allocation/portfolio treemaps or hierarchy views.
6. **Wave 5 - advanced flow/custom DOM**: cash-flow Sankey accepted
   replacement, income statement, harvest, schedule AL, doctor, recurring.

Each wave must end with a checkpoint commit and focused tests. Avoid a broad
"bulk" migration commit.

## UI Stability Rules

Do not change these unless a chart-surface fix is technically necessary:

- `Page`;
- `PageHeader`;
- `MetricStrip`;
- `Section` composition;
- `AppShell`;
- navigation;
- responsive archetype ordering;
- general spacing system;
- forms;
- tables.

Any necessary adjustment must be documented separately from chart migration
work.

## Final D3 Removal Gate

Before removing D3 dependencies:

- `rg "from ['\"]d3|import \\* as d3|d3\\.|d3-sankey-circular|d3-path-arrows" frontend/src`
  must show no production use.
- `rg "from ['\"]echarts|echarts/" frontend/src/routes frontend/src/lib/components frontend/src/lib/domain`
  must show no route/business/domain direct imports outside the internal chart
  foundation and Paisa chart components.
- D3 selectors in tests must be gone or replaced with compatibility notes only
  for removed snapshots.
- `styles/integrations/d3.css` must be deleted or reduced to zero D3-specific
  selectors.
- `app.d.ts` plugin declarations must be deleted if no longer needed.

Final expected dependency removals:

- `d3`;
- `@types/d3`;
- `d3-sankey-circular`;
- `d3-path-arrows`.

## Stop Gate

Stop here for review.

Do not begin the ECharts spike until this audit is accepted. The next approved
checkpoint should be:

`spike(charts): prove hardest visualization with echarts`
