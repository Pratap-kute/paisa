# D3 Utility Cleanup Report

Checkpoint: `refactor(charts): remove remaining d3 utility usage`

Branch: `ui/redesign`

Status: Checkpoint C complete; stop for review before dependency decommission.

## 1. Starting Inventory

The post-Checkpoint-B tree contained four direct D3 imports in application
source:

| File | D3 responsibility |
|---|---|
| `frontend/src/store.ts` | `d3.extent` for the allowed transaction date range |
| `frontend/src/lib/state/app.svelte.ts` | Duplicate `d3.extent` use in the newer state implementation |
| `frontend/src/lib/core/utils.ts` | `d3.rgb` plus dead axis, rainbow, and SVG helpers |
| `frontend/src/lib/theme/chartPalette.ts` | Ordinal and sequential color scales |

There were no production D3 chart renderers or D3-built DOM surfaces at the
start of this checkpoint. Those were removed in Checkpoints A and B.

## 2. Date Extent

`dayjsExtent` is now the shared, engine-neutral date-range helper. It returns
`[Dayjs | undefined, Dayjs | undefined]` and preserves the original Dayjs
objects rather than cloning or coercing them.

Both state implementations now call this helper. No other state consolidation
or behavior change was made.

Tests cover empty input, singleton input, unordered dates, duplicate extrema,
normal ranges, and original-object identity.

## 3. Color Adjustment

`darkenOrLighten` now parses colors with the already-installed `chroma-js`
dependency. It retains the previous AERT brightness threshold, intensity
branching, accepted CSS color inputs, and lowercase hex output.

Exact representative parity is locked for light, dark, and RGB inputs. The
dead `skipTicks`, `rainbowScale`, and `svgTruncate` helpers and their obsolete
tests were removed.

## 4. Palette Boundary

`generateColorScheme` now returns a Paisa-owned callable
`CategoryColorResolver` instead of a D3 ordinal scale.

Preserved behavior:

- semantic financial color lookup;
- the existing fixed palettes for domains of one through twelve keys;
- deterministic domain-order assignment;
- the legacy sinebow plus desaturation output for larger domains;
- callable `resolver(key)` use at existing adapters.

Unknown keys receive a deterministic, normalized-key fallback from the active
palette. An empty palette falls back to the existing neutral chart color. No
ECharts options or engine event types enter the palette API.

Tests lock semantic colors, a representative fixed palette, the exact legacy
13-key palette, repeatability, normalized unknown-key fallback, and the empty
domain fallback.

## 5. Resize and SVG Cleanup

`resize.ts` now contains only:

- `Dimensions`;
- `ResizeCallback`;
- `observeElementSize`.

The unreferenced `ChartHandle`, D3 sizing functions, redraw controller, and
client-width controller were deleted. `ChartFrame` and `EChartSurface` retain
their existing resize behavior.

`svg.ts` and `svg.test.ts` were deleted because `svgRectSpan` had no production
consumer after the final visualization migration.

## 6. Ending Inventory

Final source searches show:

- direct D3 imports in `frontend/src`: **0**;
- legitimate `d3.*` calls in application source: **0**;
- D3 scale or selection types in application source: **0**;
- production D3 chart renderers: **0**;
- production D3 DOM renderers: **0**.

The sole source search match for `d3` is the deferred stylesheet import in
`frontend/src/routes/+layout.ts`.

## 7. Deferred Checkpoint D Artifacts

Intentionally unchanged:

- `frontend/src/lib/styles/integrations/d3.css` and its layout import;
- plugin declarations in `frontend/src/app.d.ts`;
- `d3`, `@types/d3`, `d3-sankey-circular`, `d3-path-arrows`, and `textures`;
- dependency lock entries;
- historical design-document references.

Checkpoint D can now remove these artifacts from a zero-production-import
baseline.

## 8. Complexity Change

| File/surface | Before | After | Change |
|---|---:|---:|---:|
| `core/utils.ts` | 1,271 LOC | 1,229 LOC | -42 |
| `chartPalette.ts` | 497 LOC | 525 LOC | +28 |
| `resize.ts` | 169 LOC | 66 LOC | -103 |
| `svg.ts` and test | 23 LOC | 0 LOC | -23 |
| Date helper | 0 LOC | 18 LOC | +18 |
| New focused core tests | 0 LOC | 102 LOC | +102 |

The measured cleanup surfaces, including the deleted SVG test, changed by
**-122 LOC net** before the new focused tests. Production code alone changed by
**-105 LOC net**. More importantly, D3 scale, axis, selection, SVG geometry,
and route-owned chart-lifecycle concepts no longer remain in application code.

## 9. Validation

Passed:

- `deno task typecheck`;
- `deno task lint` (188 files);
- `deno task test:component` (24 files, 39 tests);
- `deno task test:core` outside the sandbox (22 files, 118 tests); the external
  run avoids the known Vitest `BiPipe` sandbox failure;
- `deno task build`;
- representative browser run: 73 checks passed, including full-page visual,
  smoke, and overflow coverage for the requested route set.

The broad browser run stopped on the chart-only Asset Analysis desktop crop.
Its actual chart used the existing narrow responsive option (labels hidden and
smaller left grid) while the stored crop expects the wide option. A focused
rerun reproduced the same resize/readiness timing difference. The full Asset
Analysis route passed all four visual variants, and the colors themselves match;
no snapshot was updated and no chart behavior was changed in this utility-only
checkpoint. Five later chart-only crops did not run after Playwright stopped on
that failure.

## 10. Boundary Confirmation

- Branch remains `ui/redesign`; `master` is untouched.
- Backend behavior and financial calculations are unchanged.
- Routes, AppShell, chart contracts, and ECharts architecture are unchanged.
- D3 remains installed for the explicit Checkpoint D decommission.
- The integration stylesheet, declarations, dependencies, and lockfile remain
  untouched.
- Checkpoint D has not started.

Stop here for review.
