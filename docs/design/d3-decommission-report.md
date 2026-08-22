# D3 Decommission Report

Checkpoint: `chore(charts): remove d3 dependencies`

Branch: `ui/redesign`

Status: D3 decommission complete; stop for review before Final Frontend QA.

## 1. Starting Artifact Inventory

Checkpoint C left no production D3 chart, DOM renderer, import, runtime API, or
type use. Checkpoint D started with these integration artifacts only:

| Class | Artifact | Disposition |
|---|---|---|
| Runtime/CSS | `styles/integrations/d3.css` and the root layout import | Removed after rule audit |
| Type declarations | `textures`, `d3-sankey-circular`, `d3-path-arrows` shims | Removed |
| Dependencies | `d3`, `@types/d3`, both plugins, and `textures` | Removed |
| Lockfile | Direct packages and their dependency trees | Regenerated with Deno |
| Current docs | `lib/README.md` and a D3-specific palette heading | Updated |
| Historical docs | Migration plans, audits, and reports | Retained as historical evidence |

No active `#d3-*` selector, production D3 identifier, or renderer-specific SVG
test remained at checkpoint start.

## 2. CSS Integration Removal

The 140-line residual `d3.css` contained:

- obsolete D3 axis, arrow, SVG text, and broad SVG rules;
- renderer-neutral `LegendCard` interaction/label rules;
- one renderer-neutral monospace utility.

The obsolete rules were deleted. The exact legend behavior now lives in
`LegendCard.svelte`, including label typography, hover, active state, and focus
independent selection styling. `.paisa-font-mono` moved to `foundation.css`.
The tax diagonal hatch remains component-owned CSS and is unchanged.

The root layout no longer imports a D3 stylesheet, and
`styles/integrations/d3.css` no longer exists.

## 3. Markup and Test Selectors

Fresh production and browser-test searches found no active `d3-*` IDs,
`#d3-*` selectors, D3-generated SVG assertions, or legacy D3 readiness checks.
Current charts continue to use Paisa-owned test IDs with
`data-chart-ready="true"`; ordinary Svelte screens use semantic text, roles,
and test IDs.

The unused SVG-specific color field returned by `dueDateIcon` was removed. Its
active renderer-neutral icon, glyph, and semantic text color output is
unchanged.

## 4. Declarations and Dependencies

Removed from `app.d.ts`:

- `textures`;
- `d3-sankey-circular`;
- `d3-path-arrows`.

Removed from `deno.json`:

- `d3`;
- `@types/d3`;
- `d3-sankey-circular`;
- `d3-path-arrows`;
- `textures`.

`deno install` regenerated `deno.lock`. No D3 package or type package remains
transitively, so Paisa has neither a direct nor transitive D3 dependency in the
frontend lockfile.

The current Sankey, Income Statement, and tax hatch implementations were not
modified. Their accepted ECharts/CSS behavior requires none of the removed
plugins.

## 5. Current Architecture

Current documentation now describes the dependency direction as:

```text
Route
  -> domain/application component
  -> typed Paisa chart component
  -> internal adapter and option builder
  -> EChartSurface
  -> Apache ECharts
```

Normal UI and document rendering use Svelte, semantic HTML, and CSS.
Historical migration reports retain their D3 references because they accurately
describe the replaced architecture.

The final ECharts boundary search found direct engine imports only in
`lib/charts/echarts` and `EChartSurface.svelte`. Routes, financial adapters,
domain modules, and unrelated components do not import ECharts or its raw
types.

## 6. Validation

Passed on the final implementation:

- `deno task typecheck`: 0 errors and 0 warnings;
- `deno task lint`: 188 files;
- `deno task test:component`: 24 files, 39 tests;
- `deno task test:core`: 22 files, 118 tests, run outside the sandbox to avoid
  the known Vitest `BiPipe` process-handle failure;
- `deno task build`;
- focused `@visual dashboard desktop-light` after rebuilding the final CSS.

An initial representative browser run exercised 32 visual, smoke, and overflow
checks before exposing that the first CSS relocation had lost effective
`LegendCard` typography. The renderer-neutral rules were moved exactly into the
component, the preview bundle was rebuilt, and the focused failing dashboard
visual then passed without snapshot changes.

The requested broad rerun could not be started after that fix because the
execution approval service reached its usage limit. No indirect workaround was
used. Final Frontend QA must rerun the complete representative/full browser
matrix.

## 7. Asset Analysis Crop Status

The existing chart-only Asset Analysis crop mismatch from Checkpoint C is
unrelated to D3 artifacts. Complete four-variant Asset Analysis route visuals
were already passing; its isolated crop can capture the narrow responsive
option after resize while the stored desktop crop expects the wide label
layout.

Checkpoint D did not modify `EChartSurface`, resize ownership, the hierarchy
adapter, or the Asset Analysis chart. No snapshot was updated. The issue remains
explicitly assigned to Final Frontend QA.

## 8. Final D3 Zero Gate

| Gate | Final count |
|---|---:|
| Production D3 charts | 0 |
| D3-as-DOM modules | 0 |
| `frontend/src` D3 imports/runtime APIs | 0 |
| D3-specific CSS files/imports | 0 |
| D3 production IDs/test selectors | 0 |
| D3 plugin declarations | 0 |
| Declared `d3` dependency | 0 |
| Declared `@types/d3` dependency | 0 |
| Declared `d3-sankey-circular` dependency | 0 |
| Declared `d3-path-arrows` dependency | 0 |
| Declared `textures` dependency | 0 |
| D3 packages in `deno.lock` | 0 |

Broad text searches still find historical documentation, hexadecimal color
substrings such as `#8dd3c7`, and a renderer-independent test description that
asserts ECharts options do not expose old D3 scale concepts. None is an active
dependency or runtime architecture artifact.

This is the formal **D3 = 0** gate.

## 9. Complexity Comparison

| Metric | Original audit | Final |
|---|---:|---:|
| Legacy chart/helper surface | about 7,926 LOC | 0 D3 renderer LOC |
| D3 integration CSS | 422 LOC | 0 LOC |
| D3-related dependencies | 5 | 0 |
| Current `lib/charts` TypeScript | n/a | 3,174 LOC |
| Internal ECharts option/foundation layer | n/a | 1,447 LOC |
| Renderer-independent financial `*_data` adapters | n/a | 1,621 LOC |
| Paisa chart Svelte components | n/a | 467 LOC |
| Remaining non-D3 integration CSS | n/a | 584 LOC |
| Visualization engine dependencies | D3 plus plugins | `echarts` only |

The final categories overlap within the 3,174-line chart directory and should
not be summed. Compared with the original renderer-heavy surface, lifecycle,
resize, tooltip positioning, axes, scales, SVG paths, DOM construction, and
plugin geometry are centralized or eliminated. Financial transformations are
renderer-independent and directly tested. The architecture is materially
simpler even where typed adapters add explicit application code.

This checkpoint itself removes 140 CSS LOC, 14 declaration LOC, five declared
dependencies, and 449 lockfile lines while relocating only the 31 lines of
renderer-neutral styling/API cleanup that remain useful.

## 10. Final Boundary

- Branch remains `ui/redesign`; `master` is untouched.
- D3 is fully removed from the active frontend and dependency graph.
- Backend behavior and financial calculations are unchanged.
- Route architecture, AppShell, navigation, forms, and tables are unchanged.
- The ECharts foundation remains domain-neutral.
- No direct ECharts imports leaked into routes, domain/application adapters, or
  unrelated components.
- Final Frontend QA has not been skipped; its full browser rerun and the Asset
  Analysis chart-crop investigation remain explicit acceptance work.

Stop here for review.
