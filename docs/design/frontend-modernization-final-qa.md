# Frontend Modernization Final QA

Date: 2026-08-23

Branch: `ui/redesign`

Status: **NOT READY FOR MASTER CUTOVER**

The web application and packaged desktop smoke are green. The acceptance gate
remains blocked because representative screens could not be manually inspected
inside the Wails window in the current environment. The requested gate defines
that inspection as mandatory, so automated success does not override it.

## 1. Repository State

- Work ran only on `ui/redesign`.
- `master` remained untouched at `a059d4c802803620aa672e488faf8008388fee63`.
- Checkpoint D was committed as `6d93c34 chore(charts): remove d3 dependencies`.
- Readiness stabilization was committed as
  `f54c74a fix(charts): stabilize chart readiness after resize`.
- Final chart QA fixes were committed as
  `2fe6c1c fix(charts): finalize chart readiness and cycle handling`.
- This report and final evidence are committed separately as
  `test(ui): finalize frontend modernization regression coverage`.
- No merge to `master` was attempted.

## 2. Route and Architecture Audit

The filesystem contains 39 production `+page.svelte` files under `(app)` plus
`/login`, for 40 production routes. `visualRoutes` declares the same 40 routes.
`/dev/ui` is excluded from that production route list and remains a development
test surface.

Active legacy gates:

| Gate | Result | Evidence |
|---|---|---|
| Bulma | 0 active dependencies/imports | Only two historical explanatory comments contain the word |
| SCSS/Sass files | 0 | No `.scss` or `.sass` application files |
| Sass dependency | 0 | No direct dependency in `frontend/deno.json` |
| D3 source imports | 0 | No direct D3 imports or production renderers |
| D3 dependencies | 0 | Removed by Checkpoint D |
| Tailwind Preflight | ON | Imported in `foundation.css` in the base layer |

Direct Apache ECharts package imports are confined to:

- `frontend/src/lib/charts/echarts/core.ts`
- `frontend/src/lib/charts/echarts/surface_lifecycle.ts`
- `frontend/src/lib/components/charts/EChartSurface.svelte`

Routes and domain/application components do not import ECharts package types or
engine events. Direct Bits UI imports remain limited to the Paisa `Dialog`,
`Drawer`, and `Popover` primitives.

The dependency direction remains:

`Route -> domain/application component -> Paisa chart component -> internal ECharts layer -> Apache ECharts`

No `Page`, `PageHeader`, `MetricStrip`, section composition, AppShell,
navigation, form, table, backend, or financial calculation redesign was made
during Final QA.

## 3. CSS and Dependency Audit

The remaining integration CSS is intentional:

| File | Purpose |
|---|---|
| `integrations/codemirror.css` | CodeMirror editor skin and vendor cascade |
| `integrations/tabulator.css` | Tabulator table integration |
| `integrations/tooltip.css` | Tippy tooltip integration and generated markup |
| `theme-switcher.css` | Application theme switcher behavior |
| `legacy-compat.css` | Narrow compatibility utilities still used by application markup |

There are 65 `!important` declarations: 10 in CodeMirror integration, 40 in
Tippy integration, and 15 in `legacy-compat.css`. They are confined to vendor
generated markup/cascade boundaries and compatibility utility classes. No
route-local override was added during Final QA.

There are 574 raw hex matches in frontend CSS/TS/Svelte, of which 518 are in
the centralized token/style layer. The remainder belongs to the established
chart palette or component-native/domain styling. Semantic state colors and
deterministic categorical chart colors remain centralized; this gate did not
introduce a replacement palette or scatter new route colors.

CodeMirror, Tippy, Tabulator, Bits UI, Tailwind, and ECharts are active and
justified dependencies. Bulma, Sass, D3, `@types/d3`, `d3-sankey-circular`,
`d3-path-arrows`, and `textures` are no longer declared.

Historical migration reports were retained. Current architecture documentation
now describes ECharts and renderer-independent financial adapters rather than
D3 renderers.

## 4. Asset Analysis Readiness

Disposition: **FIXED**.

Tracing confirmed that the old zero-delay fallback could expose readiness
before the final positive container dimensions and resize generation settled.
It also exposed an initialization feedback loop: the mount effect tracked the
controller state read by `ensureChart`, allowing dispose/recreate cycles.

The shared fix now:

- invalidates readiness on initialization, option updates, and meaningful size
  changes;
- requires positive dimensions;
- tracks the latest render/resize generation;
- waits for stable dimensions across animation frames and uses ECharts
  `finished` when available;
- ignores stale generations and cancels pending work during update/disposal;
- exposes readiness through Paisa-owned component state;
- initializes the controller from an untracked mount boundary;
- suppresses duplicate same-size resize work.

Lifecycle tests cover resize after init, updates while readiness is pending,
stale completion, stable-size fallback, duplicate dimensions, disposal, event
lifecycle, and SSR safety. Both Asset Analysis chart crops and all four route
variants pass with the generic fix. No route-specific delay, conditional, or
snapshot-only workaround remains.

## 5. Additional QA Fixes

The generated yearly cash-flow fixture currently contains a true directed
cycle. ECharts Sankey rejects cyclic graphs, so the accepted renderer now uses
Sankey for DAG data and an internal ECharts directed Graph fallback for cyclic
data. The fallback preserves source, target, amount, node identity, tooltip,
theme, and responsive behavior without restoring D3 or implementing custom
circular paths. Renderer-independent tests assert cycle selection and link
value/identity parity.

Other shared corrections were limited to:

- stable period-axis label density at compact widths;
- removal of percentage-height feedback from timeline chart frames;
- atomic goal forecast/breakpoint publication to avoid half-updated chart
  states.

Financial formulas and aggregation remain unchanged.

## 6. Automated Validation

Final results from `frontend/`:

| Check | Result |
|---|---|
| `deno task typecheck` | PASS, 0 errors and 0 warnings |
| `deno task lint` | PASS, 188 files |
| `deno task test:component` | PASS, 24 files / 39 tests |
| `deno task test:core` | PASS, 22 files / 122 tests |
| `deno task build` | PASS, static production output generated |
| `deno task test:e2e` | PASS, 81 passed / 1 skipped / 0 failed |
| `deno task test:visual` | PASS, 170 passed / 0 failed |

Core tests were run outside the sandbox because of the known Vitest fork-pool
`BiPipe` startup limitation. The tests themselves completed cleanly.

The 170 visual tests comprise 160 production-route variants and 10 focused
chart crops. All snapshots were reviewed individually; no mass update was
performed. The reviewed set includes Dashboard, Monthly Expenses,
Transactions, Ledger Import, Asset Analysis, Budget, Configuration, Ledger
Editor, Credit Card Detail, Income, Investment, Cash Flow, goals, and mobile
AppShell states across light/dark and desktop/mobile variants.

The E2E suite includes 40 route-width overflow assertions for 10 high-risk
routes at 390, 768, 1024, and 1440 pixels, plus sidebar behavior at 1024 and
1280 pixels. Transactions, Prices, Postings, Import, Editor, Asset Analysis,
Configuration, and chart-heavy pages remained within their expected layout
boundaries.

## 7. Workflow, Console, and Performance Review

Focused browser coverage exercised AppShell/navigation, Tabulator routes,
CodeMirror editor routes, Ledger Import, Configuration, Tax Harvest, Schedule
AL, Doctor, chart readiness, theme variants, and navigation disposal.

During diagnosis, the suite exposed and led to fixes for an ECharts cyclic
Sankey error and a Svelte effect update loop. Final clean visual/E2E runs showed
no observed hydration, Svelte lifecycle, ECharts duplicate-instance,
duplicate-key, or ResizeObserver errors.

Dashboard, Asset Analysis, Liability Interest, Income Statement, goals, and
Ledger Import completed within the existing test budgets. No new benchmark was
introduced and no speculative optimization was made. Tooltip, legend, resize,
theme, first-render, and disposal behavior are covered through shared lifecycle
tests and the visual/browser matrix.

Renderer-independent tests continue to cover totals, balances, gain/loss,
XIRR, expense/cash-flow grouping, allocation, interest, goals, tax, Income
Statement, Schedule AL, and Harvest transformations, including available empty,
singleton, zero, negative, partial, missing-price, long-label, and large-value
fixtures.

## 8. Wails Gate

A packaged binary was successfully built at:

`desktop/build/bin/Paisa`

With `PAISA_DESKTOP_BINARY` set to that executable,
`deno task test:desktop` passed. This proves process startup and the automated
desktop smoke contract.

Manual inspection of Dashboard, Asset Analysis, Ledger Editor, and Transactions
inside the Wails window could not be completed in the current execution
environment. Although a display session exists, no usable interactive capture
or window-control path was available to verify Canvas/DPR, tooltips, live theme
switching, navigation, CodeMirror, and Tabulator by hand.

Per the acceptance requirement, this is blocking. Gate U is FAIL until a human
completes and records that representative packaged-app inspection.

## 9. Complexity Result

The original audit measured 7,926 LOC in the legacy chart/helper surface and
422 LOC of D3 integration CSS. The decommission report records:

- 0 D3 renderer LOC;
- 0 D3 integration CSS LOC;
- 3,174 LOC of current chart TypeScript;
- 1,447 LOC in the internal ECharts option/foundation layer;
- 1,621 LOC in renderer-independent financial adapters;
- 467 LOC in Paisa chart Svelte components.

The result replaces route-owned SVG geometry, axes, tooltip positioning,
resize, and lifecycle code with a shared engine boundary and independently
tested financial transformations. D3 production imports and dependencies are
zero.

## 10. Acceptance Matrix A-W

| Gate | Requirement | Result |
|---|---|---|
| A | Correct branch, master untouched, scoped commits | PASS |
| B | 40 production routes and visual inventory agree | PASS |
| C | Bulma zero | PASS |
| D | SCSS and Sass zero | PASS |
| E | D3 source, renderer, CSS, and dependencies zero | PASS |
| F | Tailwind Preflight enabled | PASS |
| G | ECharts and Bits UI dependency boundaries | PASS |
| H | CSS, important, raw-color, and dependency audit | PASS, documented exceptions |
| I | Typecheck | PASS |
| J | Lint | PASS |
| K | Component tests | PASS |
| L | Core/domain tests | PASS |
| M | Production build | PASS |
| N | Full E2E | PASS |
| O | Full visual matrix and manual snapshot review | PASS |
| P | Overflow/responsive suite | PASS |
| Q | Asset Analysis readiness race | PASS, FIXED |
| R | Financial adapter/domain parity | PASS |
| S | App workflows and integration surfaces | PASS |
| T | Console and performance sanity | PASS |
| U | Packaged Wails validation | **FAIL: smoke passes, manual inspection incomplete** |
| V | Entire frontend acceptance complete | FAIL because U is blocking |
| W | Master cutover recommendation | **NOT READY FOR MASTER CUTOVER** |

## 11. Required Human Follow-up

Run the packaged binary in an inspectable desktop session and review Dashboard,
Asset Analysis, Ledger Editor, and Transactions. Record Canvas initialization,
ResizeObserver/DPR, tooltips, theme switching, navigation, CodeMirror, and
Tabulator results. If that inspection passes without a real regression, Gate U
can be changed to PASS and the cutover recommendation can be reevaluated.

Stop here. Do not merge `ui/redesign` to `master` while Gate U remains open.
