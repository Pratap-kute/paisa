# Paisa ECharts Foundation Report

Checkpoint: `feat(charts): add paisa echarts foundation`

Branch: `ui/redesign`

Status: foundation checkpoint complete; stop for review before Wave 1.

## 1. Final Chart-Layer File Structure

Generic ECharts foundation:

- `frontend/src/lib/charts/echarts/core.ts`
- `frontend/src/lib/charts/echarts/surface_lifecycle.ts`
- `frontend/src/lib/charts/echarts/theme.ts`
- `frontend/src/lib/charts/echarts/formatters.ts`
- `frontend/src/lib/components/charts/EChartSurface.svelte`

Proven flow contract:

- `frontend/src/lib/charts/echarts/flow.ts`

Cash-flow/Sankey implementation:

- `frontend/src/lib/charts/echarts/cash_flow_sankey.ts`
- `frontend/src/lib/charts/cash_flow_sankey_data.ts`
- `frontend/src/lib/components/charts/CashFlowSankeyChart.svelte`

No time-series, category, hierarchy, or period contracts were introduced in
this checkpoint. Those will be added only when their migration waves prove a
shared representation.

## 2. EChartSurface Responsibilities

`EChartSurface` owns the ECharts rendering container and delegates engine calls
to `surface_lifecycle.ts`.

It now covers:

- SSR-safe lazy chart initialization;
- option updates;
- `ResizeObserver` integration through `observeElementSize`;
- `chart.resize()` forwarding;
- live theme refresh through option updates;
- typed Paisa event handler attachment/detachment;
- readiness state via `data-chart-ready`;
- cleanup and disposal.

It does not own route layout, loading, empty states, labels, legends, or
business calculations.

## 3. ChartFrame Boundary

`ChartFrame` remains the canonical chart chrome and layout wrapper. It still
owns:

- title/actions;
- loading, empty, and error states;
- available chart body region;
- chart sizing classes.

For ECharts charts, `EChartSurface` owns only the render surface inside that
region and calls `chart.resize()` from its own observer. D3 resize behavior for
unmigrated charts was not changed.

## 4. ECharts Registration Strategy

Registration is centralized in `core.ts`.

Current registrations are limited to:

- `CanvasRenderer`;
- `SankeyChart`;
- `TooltipComponent`.

SVG renderer registration was removed because this accepted spike uses Canvas
and no current visual test requires SVG.

## 5. Renderer Choice

Canvas remains the default and only registered renderer for the current
foundation. No routine chart reinitialization is required for light/dark changes;
theme changes flow through rebuilt options and `setOption`.

## 6. Theme Strategy

Paisa semantic CSS tokens remain the source of truth.

Flow:

`Paisa tokens -> PaisaChartTheme -> option builders`

The central theme model includes foreground, muted foreground, border/grid,
surface, tooltip surface, semantic positive/negative/warning/neutral colors,
primary, and chart series colors. It is a bridge over existing tokens, not an
independent ECharts theme system.

## 7. Formatter Strategy

`formatters.ts` exposes chart formatter helpers by delegating to existing Paisa
formatters from `core/utils`.

This preserves existing locale, precision, unicode-minus, and number-obscuring
behavior instead of creating chart-local formatting rules.

## 8. Typed Contracts

Only proven flow contracts were added:

- `FlowNode`;
- `FlowLink`.

Raw ECharts option and event types remain inside the internal ECharts layer.
Routes and business/domain components do not import ECharts directly.

## 9. Event API

The surface accepts typed Paisa chart events:

- `click`;
- `mouseover`;
- `mouseout`.

Handlers receive a small Paisa-owned payload shape rather than a raw ECharts
event object. The lifecycle controller attaches handlers on init, replaces them
on update, and detaches them on dispose.

## 10. Sankey Refactor Result

Cash Flow Yearly still renders through:

`CashFlowSankeyChart -> buildCashFlowSankeyData -> buildCashFlowSankeyOption -> EChartSurface`

The refactor preserved:

- graph input;
- node/link value parity;
- directed-cycle detection;
- legend generation;
- mobile label behavior;
- light/dark token-driven colors.

The old D3 implementation remains in place for later accepted removal.

## 11. Tests

Foundation/core coverage now verifies:

- init called once;
- update behavior;
- update-before-init behavior;
- resize forwarding;
- readiness marker;
- event attach/replace/detach;
- disposal;
- Paisa token theme mapping;
- Paisa formatter delegation;
- Sankey node/link/cycle parity.

Browser/visual validation remains responsible for proving actual Canvas
rendering.

## 12. LOC Introduced

Current ECharts foundation and Sankey checkpoint files:

| File | LOC |
|---|---:|
| `cash_flow_sankey.ts` | 296 |
| `core.ts` | 21 |
| `flow.ts` | 17 |
| `formatters.ts` | 13 |
| `surface_lifecycle.ts` | 153 |
| `theme.ts` | 52 |
| `CashFlowSankeyChart.svelte` | 40 |
| `EChartSurface.svelte` | 102 |

Total implementation LOC in the checkpoint layer: 694.

## 13. Duplication Removed From Spike

Future migrated charts no longer need to reimplement:

- ECharts init;
- disposal;
- resize observation;
- theme-triggered option refresh;
- renderer selection;
- event lifecycle;
- readiness selectors;
- tooltip color defaults;
- Paisa formatter delegation.

## 14. Expected Reuse

Wave migrations should start from a chart intent component and an internal
option builder, then reuse `EChartSurface`, `PaisaChartTheme`, formatter helpers,
and typed events. New contracts should be added only when the corresponding
production chart wave proves the shared shape.

Do not begin Wave 1 until this foundation checkpoint is reviewed.
