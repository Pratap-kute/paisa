# Frontend Chart Architecture

This document describes the production chart architecture. Historical migration
checkpoints are intentionally not part of the maintained documentation.

## Dependency Boundary

```text
Route or domain component
  -> renderer-independent financial adapter
  -> Paisa chart component
  -> internal ECharts option builder
  -> EChartSurface
  -> Apache ECharts
```

Routes do not import ECharts types or APIs. Financial grouping, totals,
percentages, projections, XIRR, and account relationships are computed before
the option-builder boundary.

## Layout And Lifecycle

- `ChartFrame` owns chart chrome, loading/empty/error states, and the available
  content region.
- `EChartSurface` lazily initializes one Canvas chart in the browser, owns the
  single `ResizeObserver`, forwards meaningful size changes to `chart.resize()`,
  updates options and events, exposes `data-chart-ready`, and disposes the
  chart.
- Chart wrappers rebuild responsive options only when crossing the 640px compact
  breakpoint. Ordinary width changes are handled by ECharts resize.
- Charts render without animation. This keeps financial geometry deterministic,
  avoids partially rendered readiness states, and reduces background work.
- Paisa semantic CSS tokens feed the chart theme. Option builders do not contain
  raw application palettes.

## Production Inventory

| Financial surface                | Renderer                                 | Adapter / option family                         | Interaction retained                |
| -------------------------------- | ---------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| Dashboard cash flow              | mixed bar/line                           | `mixed_period_data` / `period_series`           | tooltip, legend                     |
| Dashboard expense breakdown      | horizontal bar                           | `bar_comparison_data` / `bar_comparison`        | tooltip                             |
| Net worth                        | line/area                                | `time_series_data` / `period_series`            | tooltip, legend                     |
| Investment monthly/yearly        | stacked bars                             | `time_series_data` / `period_series`            | tooltip, legend                     |
| Income monthly/yearly            | stacked bars and lines                   | `time_series_data` / `period_series`            | tooltip, legend                     |
| Monthly/yearly expense breakdown | horizontal bar                           | `bar_comparison_data` / `bar_comparison`        | tooltip                             |
| Monthly expense calendar         | native CSS grid                          | `expense_heatmap_data` / `DailyExpenseCalendar` | date/posting hover and focus detail |
| Yearly expense activity          | monthly heatmap                          | `expense_heatmap_data` / `expense_heatmap`      | month/category tooltip              |
| Monthly/yearly expense timeline  | stacked bars and cumulative line         | `mixed_period_data` / `period_series`           | selectable external legend, tooltip |
| Asset allocation target          | comparison bar                           | `bar_comparison_data` / `bar_comparison`        | tooltip                             |
| Asset allocation hierarchy/value | treemap                                  | `hierarchy_data` / `hierarchy`                  | hierarchy tooltip                   |
| Asset allocation timeline        | percentage lines                         | `mixed_period_data` / `period_series`           | tooltip, legend                     |
| Portfolio analysis summaries     | comparison bar                           | `hierarchy_data` / `bar_comparison`             | tooltip                             |
| Portfolio industry/holdings      | treemap                                  | `hierarchy_data` / `hierarchy`                  | hierarchy tooltip                   |
| Asset gain overview/detail       | comparison and period series             | `bar_comparison_data`, `time_series_data`       | account navigation, tooltip, legend |
| Credit-card yearly spend         | comparison bar                           | `bar_comparison_data` / `bar_comparison`        | tooltip                             |
| Liability repayment              | stacked bars                             | `time_series_data` / `period_series`            | tooltip, legend                     |
| Liability interest               | comparison and period series             | `interest_data` / shared option families        | tooltip, legend                     |
| Savings/retirement goals         | line/area/bar                            | `time_series_data` / `period_series`            | tooltip, milestones, legend         |
| Monthly cash flow                | mixed bar/line                           | `mixed_period_data` / `period_series`           | tooltip, legend                     |
| Yearly cash flow                 | Sankey or graph fallback for true cycles | `cash_flow_sankey_data` / `cash_flow_sankey`    | tooltip, depth filtering            |
| Income statement                 | waterfall                                | `income_statement_data` / `waterfall`           | section/account tooltip             |

Normal tables, cards, forms, and progress indicators are rendered with Svelte,
HTML, and CSS rather than a chart engine.

## Data And Color Rules

- Missing period values remain `null`; they are not converted into financial
  zeroes or connected across gaps.
- Percentage series use fractional values (`0.25` means 25%).
- Category colors are assigned deterministically from normalized category keys
  and the token-backed series palette. Semantic gain/loss/status colors remain
  separate.
- Calendar adapters distinguish missing periods, true zero-value activity, and
  positive activity. Calendar geometry is owned by ECharts; token-driven color
  intensity is computed from the adapter value range.
- Tooltips use Paisa currency/number/percentage formatters and explicit tooltip
  foreground/background tokens.

## Test Contract

- Core tests validate adapter totals, ordering, missing values, percentages,
  hierarchy relationships, cycle detection, tooltip rows, and option semantics
  independently of Canvas.
- Component tests mock the engine boundary and cover initialization, updates,
  resize, event replacement, readiness, disposal, and SSR behavior.
- Browser tests wait on a Paisa-owned test ID plus `data-chart-ready="true"`;
  they do not inspect Canvas or zrender internals.
- The visual matrix covers every production route at desktop, tablet, and mobile
  widths in light/dark where defined. Focused crops cover each high-risk
  renderer family.
- Browser runs always rebuild the frontend so screenshots cannot use stale
  static assets.

## Extension Rules

Prefer an existing chart family when its financial intent fits. Add a new
adapter or option family only when a production visualization proves a distinct
contract. Keep resize ownership in `EChartSurface`, financial calculations out
of option builders, and engine events/types inside the internal chart layer.
