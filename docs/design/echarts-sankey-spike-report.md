# ECharts Sankey Spike Report

Checkpoint: `spike(charts): prove hardest visualization with echarts`

Branch: `ui/redesign`

Status: spike complete; stop for review before shared chart foundation or other
chart migrations.

## 1. Yearly Cash-Flow Domain Pipeline

The route still uses the existing domain/API pipeline:

1. `/cash_flow/yearly` loads `/api/expense`.
2. `/api/expense` returns `graph: Record<string, Graph>` keyed by financial
   year.
3. The selected `$year` chooses one yearly graph.
4. The existing route-local `filter(graph, incomeDepth, expenseDepth)` preserves
   account hierarchy behavior by removing Income/Expenses nodes deeper than the
   selected depth controls.
5. The selected filtered `Graph` is passed unchanged to the Sankey adapter.

The spike does not change financial year selection, income depth, expense depth,
account hierarchy, cash-flow aggregation, node source/target ids, or link
values.

## 2. Domain Code Preserved

Preserved:

- `/api/expense` contract.
- `Graph`, `Node`, and `Link` domain types.
- route depth-control logic.
- selected-year behavior.
- all backend and calculation code.

Changed only at the route visualization boundary:

- the route now passes the filtered `Graph` to `CashFlowSankeyChart`.
- legends are derived from `buildCashFlowSankeyData(selectedGraph)`.

The original D3 yearly Sankey implementation remains in `cash_flow.ts` for this
review checkpoint; D3 is not removed globally.

## 3. Previous D3 Rendering Responsibilities

The old yearly Sankey path in `cash_flow.ts` owned:

- DOM lookup by `#d3-expense-flow`;
- SVG sizing and minimum width behavior;
- `d3-sankey-circular` layout;
- node rectangle creation;
- link path creation;
- `d3-path-arrows` arrow rendering;
- label positioning and anchoring;
- manual tooltip HTML via Tippy attributes;
- color scale creation;
- destroy/clear behavior.

## 4. Chosen ECharts Approach

Chosen approach: **ECharts Sankey using Canvas renderer**.

New boundary:

`CashFlowSankeyChart.svelte -> typed CashFlowSankeyData -> buildCashFlowSankeyOption -> EChartSurface.svelte -> Apache ECharts`

The route and domain components do not import ECharts directly. ECharts imports
are limited to the internal chart implementation layer.

## 5. Directed-Cycle Evaluation

The adapter now detects true directed cycles with a DFS recursion-stack pass
over the filtered `Graph`. This is spike-validation logic in the chart adapter,
not a new domain-model concern.

Real fixture result:

- `frontend/tests/fixture/browser/expense.json`: 0 true directed cycles.
- `frontend/tests/fixture/eur-hledger/expense.json`: 0 true directed cycles.
- `frontend/tests/fixture/eur/expense.json`: 0 true directed cycles.
- `frontend/tests/fixture/inr-beancount/expense.json`: 0 true directed cycles.
- `frontend/tests/fixture/inr-hledger/expense.json`: 0 true directed cycles.
- `frontend/tests/fixture/inr/expense.json`: 0 true directed cycles.

No real fixture nodes or links form a directed cycle. Some links point to
earlier-listed nodes, but they do not complete a cycle. The earlier spike
heuristic treated those as circular; the corrected validation does not.

Explicit test coverage includes a synthetic true cycle:

`A -> B -> C -> A`

The current Paisa data therefore does not require circular rendering today.
`d3-sankey-circular` was historically capable of circular layouts, but the
post-Phase-7 fixture cash-flow graphs do not exercise that capability. Because
no real directed cycles exist, the ECharts Graph/Lines fallback was not needed
for this checkpoint.

## 6. Arrow-Direction Decision

The previous D3 chart used `d3-path-arrows`.

The spike does not add a custom arrow renderer. Direction remains communicated
through:

- Sankey source/target ordering;
- adjacency emphasis on hover;
- tooltip text showing source, destination, and amount.

Recommendation: do not reimplement custom arrows unless review finds that
direction is unclear in real fixture screenshots. Avoid recreating D3-sized path
geometry inside ECharts.

## 7. Financial Parity Results

Renderer-independent tests verify:

- node ids are preserved;
- link source/target/value tuples match the input `Graph`;
- total link value is unchanged;
- node value is derived from max incoming/outgoing flow;
- circular-link detection is explicit;
- generated options are intent-shaped and do not expose D3 scale/path concepts.

No totals, balances, account hierarchy, year selection, income depth, or expense
depth calculation changed.

## 8. Tooltip Parity

The ECharts tooltip shows:

- source account;
- destination account;
- formatted amount for links;
- account and formatted total for nodes.

It uses ECharts' confined tooltip behavior instead of manual DOM positioning.
That should be better on narrow mobile viewports.

## 9. Responsive and Mobile Behavior

`ChartFrame` remains the shell. `EChartSurface` observes its actual container
with the existing `observeElementSize` helper and resizes ECharts directly.

Mobile-specific option changes at widths below 640px:

- narrower node width;
- smaller node gap;
- smaller label font;
- shorter label width;
- label omits value to reduce crowding while tooltip keeps values available.

Route ordering and surrounding layout were not changed.

## 10. Light/Dark Result

The spike reads Paisa semantic CSS tokens for text, muted text, and border
colors. Category colors continue through the existing `generateColorScheme`
path, so the spike does not introduce a separate Sankey palette.

The targeted visual run passed:

- `@visual cash-flow-yearly desktop-light`
- `@visual cash-flow-yearly desktop-dark`
- `@visual cash-flow-yearly mobile-light`
- `@visual cash-flow-yearly mobile-dark`

## 11. Renderer Choice

Renderer: **Canvas**.

Reason:

- ECharts Sankey defaults to Canvas.
- The spike no longer needs custom SVG paths or arrow glyphs.
- Visual route screenshots passed with Canvas.

SVG remains registered internally only so future review can switch a chart if a
specific accessibility/snapshot need appears.

## 12. Complexity and Bundle Impact

Old yearly Sankey rendering lived in `cash_flow.ts` lines 448-631, alongside the
monthly cash-flow renderer. The file remains 631 LOC because other D3 charts are
out of scope for this checkpoint.

New spike code:

| File                         | LOC |
| ---------------------------- | --: |
| `cash_flow_sankey.ts`        | 230 |
| `core.ts`                    |  28 |
| `surface_lifecycle.ts`       |  53 |
| `EChartSurface.svelte`       |  86 |
| `CashFlowSankeyChart.svelte` |  39 |

This checkpoint adds more files than it removes because the old D3 renderer is
kept for review. The maintenance win is qualitative at this stage:

- custom Sankey path geometry removed from the active route;
- custom arrow rendering removed from the active route;
- manual tooltip DOM positioning removed from the active route;
- resize/lifecycle isolated in `EChartSurface`;
- financial node/link transformation is now testable without a renderer.

Dependencies added:

- `echarts@6.1.0`;
- transitive `zrender@6.1.0`.

D3 dependencies remain intentionally in place for the review gate.

## 13. Tests and Results

Passed:

- `deno task typecheck`
- `deno task lint`
- `deno task test:component`
- `deno task test:core` outside sandbox, needed because the sandboxed Vitest
  fork pool fails before tests start with `fd is not from BiPipe`
- `deno task build`
- `deno task test:visual --grep "cash-flow-yearly"` outside sandbox: 4/4 visual
  variants passed

Attempted:

- `deno task test:e2e --grep cash-flow-yearly` found no tests because Cash Flow
  Yearly is covered by visual route names, not non-visual test titles.

## 14. Unresolved Differences

- ECharts Sankey does not recreate `d3-sankey-circular` circular path geometry,
  but real current Paisa fixture graphs contain no true directed cycles.
- Visible arrows are not rendered in the spike.
- Mobile labels are simplified and rely on tooltip values for full amounts.
- The old D3 implementation is still present for review and must be removed for
  this chart if the spike is accepted.

## 15. Recommendation

**ACCEPT SIMPLIFIED ECHARTS REPRESENTATION**

The spike preserves the important financial question: where money came from and
where it went during the selected financial period/account-depth context.

It passes financial node/link parity tests and Cash Flow Yearly visual coverage
across desktop/mobile and light/dark. The circular path and arrows should be
reviewed visually, but they do not appear essential enough to justify rebuilding
D3-like custom geometry inside ECharts.

Stop here for review.
