# ECharts Wave 4 Calendar and Hierarchy Report

Checkpoint: `feat(charts): migrate calendar and hierarchy visualizations`

Branch: `ui/redesign`

Status: complete; stop for review before Wave 5.

## Migrated Surfaces

- Monthly Expenses: D3 day-cell donuts replaced by an ECharts calendar heatmap.
- Yearly Expenses: D3 month-card pies replaced by a 12-cell financial-year heatmap.
- Asset Allocation: D3 partition and value treemap replaced by token-driven ECharts hierarchy treemaps.
- Portfolio Analysis: flat security type/rating summaries use `ComparisonBarChart`; industry and holdings use hierarchy treemaps.
- Asset Gain detail: the four former `small` portfolio renderers use `ComparisonBarChart`.

The monthly/yearly expense timelines and allocation composition timeline remain on D3 for a later controlled wave.

## Data Contracts and Financial Parity

`ExpenseHeatmapData` contains period identity, exact total, activity presence,
and Paisa-owned tooltip rows. Monthly adapters preserve posting-level daily
totals and selected expense groups. Yearly adapters preserve twelve-month
financial-year ordering and category totals without creating synthetic daily
values.

`FinancialHierarchyNode` contains stable identity, label, value, percentage,
categorical identity, metadata, and children. Allocation parents derive value
from descendants only when their own domain value is zero. Portfolio filtering
still clones inputs, filters commodity breakdowns, and recalculates visible
aggregate and child shares.

No totals, percentages, grouping rules, commodity filters, account hierarchy,
or date-period calculations moved into ECharts option builders.

## Renderer Decisions

- Monthly activity uses ECharts Calendar + Heatmap because the financial question is daily magnitude.
- Yearly activity uses a categorical month heatmap because the source question is monthly, not daily.
- Portfolio flat views reuse the Wave 2 comparison contract rather than forcing hierarchy.
- Portfolio parent/security views use Treemap with tooltips and stable category colors.
- Allocation Tree was tested against the production fixture but produced collapsed or blank Canvas output for its mix of zero, negative, and nested account nodes. The accepted fallback is a nested Treemap for the category view; no custom geometry or D3 restoration was introduced.

Both allocation views therefore preserve hierarchy and market values, while the
section titles distinguish nested account grouping from magnitude analysis.

## Foundation and Lifecycle

The foundation now registers only Heatmap, Treemap, Calendar, and VisualMap in
addition to previously required modules. `ChartFrame` still owns layout and
`EChartSurface` owns rendering and resize. A lazy-init race found on Asset Gain
detail was fixed by verifying that the bound surface is still connected after
the dynamic ECharts import and before initialization.

Readiness uses Paisa test IDs with `data-chart-ready="true"`; tests do not inspect
Canvas, zrender, or generated ECharts DOM.

## Removed Legacy Code

- Deleted the 421-line coupled `portfolio.ts` D3 renderer.
- Removed 128 monthly and 137 yearly D3 calendar-rendering lines.
- Removed 105 allocation partition/treemap lines.
- Removed the D3 `pieData` helper and 157 lines of calendar/hierarchy CSS.
- Removed route-owned D3 scale types and resize handles for migrated surfaces.

The new adapter, option-builder, and thin component layer is 524 implementation
LOC before tests. The checkpoint removes more than 900 lines of renderer-specific
code and replaces manual DOM/SVG/tooltip/resize concepts with two typed families.

## Validation

Passed:

- `deno task typecheck`
- `deno task lint`
- `deno task test:component`: 24 files / 39 tests
- `deno task test:core`: 17 files / 104 tests, outside the sandbox because of the known Vitest `BiPipe` failure
- `deno task build`
- affected visual/overflow matrix: 43 tests across desktop/mobile, light/dark, and 390/768/1024/1440 widths during snapshot review
- focused post-lifecycle-fix Asset Gain detail matrix: 4/4
- production smoke: 6/6 for Dashboard, Monthly Expenses, Transactions, Ledger Import, Configuration, and Ledger Editor

Renderer-independent tests cover leap and ordinary months, exact date counts,
zero versus missing activity, filtering, financial-year boundaries, account
parentage, derived allocation totals, commodity filtering, visible percentages,
flat comparison output, and portfolio child metadata.

## Remaining D3 Boundary

Thirteen source files still import D3. They are limited to deferred expense and
allocation timelines, cash-flow/mixed charts, liability interest, Income
Statement, Doctor/Harvest/Schedule AL DOM rendering, and shared utility/palette
consumers. D3 packages remain installed.

Direct ECharts imports remain inside the internal chart implementation boundary;
routes and domain/application components do not import ECharts or raw ECharts
types.

## Acceptance Boundary

- Branch remains `ui/redesign`; `master` is untouched.
- Backend and financial calculations are unchanged.
- Page, shell, navigation, forms, tables, and route composition are unchanged.
- No Wave 5 flow/mixed visualization was migrated.
- D3 remains globally installed.

Stop here for Wave 4 review.
