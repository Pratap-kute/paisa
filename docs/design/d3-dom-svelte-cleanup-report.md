# D3 DOM to Svelte Cleanup Report

Checkpoint: `refactor(ui): replace d3 dom rendering with svelte`

Branch: `ui/redesign`

Status: Checkpoint B complete; stop for review before utility cleanup.

## Fresh Starting Inventory

The post-Checkpoint-A source had seven direct production `d3` imports.

| Classification | Files | Disposition |
|---|---|---|
| DOM construction | `charts/harvest.ts`, `charts/schedule_al.ts`, `charts/doctor.ts` | Migrated in Checkpoint B |
| Utility | `store.ts`, `state/app.svelte.ts`, `core/utils.ts` | Deferred to Checkpoint C |
| Compatibility/helper | `theme/chartPalette.ts` | Deferred to Checkpoint C |
| Integration/type/CSS | `d3.css`, layout import, plugin declarations and dependencies | Deferred to Checkpoint D |

There were already zero production D3 chart renderers. The remaining
`d3.select` in `core/utils.ts` belongs to the deferred `svgTruncate` utility,
not an active DOM renderer.

## Tax Harvest

`renderHarvestables` was replaced by declarative `HarvestCard.svelte` markup.
The route now filters API values into Svelte state and keys cards by account.
Cards use semantic headers, labelled number inputs, summary/detail tables, and
a CSS two-segment units indicator. No ECharts or texture dependency is used.

The following behavior moved unchanged into testable `harvest_data.ts`:

- positive harvestable filtering and source order;
- `unitsRequiredFromGain`;
- `unitsRequiredFromAmount`;
- partial-lot taxable gain and redemption calculations;
- harvestable percentage.

The calculator still updates amount, units, and taxable gain in either
direction. The units bar clamps only its rendered width; the displayed
percentage preserves zero, partial, full, and overflow values.

Harvest-specific CSS moved from the global D3 integration into the component.
The old `#d3-harvestables` selector family was removed.

## Schedule AL

The D3-mutated table body is now a keyed Svelte `each` block with a semantic
`tfoot`. Entry order, codes, sections, details, currency formatting, selected
financial year, and empty state are unchanged. `scheduleALTotal` is a pure
renderer-independent helper and is covered for empty, positive, negative, and
ordered input.

## Doctor

Issue cards are now Svelte articles keyed in API order. Summary, description,
details, severity, and token-driven status styling are preserved. Severity is
rendered as text as well as color. The no-issue count now has an explicit empty
message. Trusted API description/detail markup remains supported through
Svelte's declarative HTML rendering.

## Accessibility and Tests

- Harvest calculator inputs have associated accessible labels.
- Tax summaries and Schedule AL use semantic tables and row headers.
- Doctor issues use article/header/heading structure and visible severity text.
- Browser tests use roles, labels, text, and Paisa test IDs rather than D3 DOM
  structure.

Added five renderer-independent tests covering Harvest filtering, bidirectional
calculator parity, nonmutation, percentage edge cases, and Schedule AL totals.
Added a production-browser calculator interaction test and strengthened Doctor
status coverage.

Validation passed:

- `deno task typecheck`: 0 errors and 0 warnings
- `deno task lint`: 188 files
- `deno task test:component`: 24 files / 39 tests
- `deno task test:core`: 20 files / 109 tests
- `deno task build`
- focused Doctor and Harvest browser interactions: 2/2
- affected visual/browser run: 13/13, including all 12 route/theme/viewport variants
- representative production and Asset Analysis overflow smoke: 10/10

Visual review covered Doctor, Tax Harvest, and Schedule AL at 1440x900 and
390x844 in light/dark. Tax Harvest preserves horizontal detail-table access on
mobile without overflowing the page.

## Complexity

Removed:

- D3 DOM modules: 420 LOC (`harvest.ts` 335, `schedule_al.ts` 33,
  `doctor.ts` 52)
- D3 integration CSS: 80 LOC

Added implementation:

- `HarvestCard.svelte`: 141 LOC including scoped CSS
- renderer-independent helpers: 71 LOC
- route markup/state net increase: 36 LOC
- parity tests: 100 LOC

Production replacement code is approximately 248 LOC versus 500 LOC of D3
renderer plus global CSS, a reduction of about 252 LOC and, more importantly,
removal of imperative selection/append/update lifecycles.

`d3.css` decreased from 220 to 140 LOC. Its remaining selectors are deferred
renderer/integration artifacts and are not broadened in this checkpoint.

## Final D3 Audit

Direct production `d3` imports: **4**.

1. `frontend/src/store.ts`: `d3.extent` date utility.
2. `frontend/src/lib/state/app.svelte.ts`: duplicate `d3.extent` date utility.
3. `frontend/src/lib/core/utils.ts`: deferred color/tick/dead SVG utilities.
4. `frontend/src/lib/theme/chartPalette.ts`: ordinal palette compatibility.

Required outcomes:

- production D3 chart renderers: **0**
- production D3-as-DOM modules: **0**
- D3 dependencies: intentionally retained

## Boundary Confirmation

- Branch remains `ui/redesign`; `master` is untouched.
- Checkpoint C utility cleanup has not started.
- ECharts foundation and chart architecture are unchanged.
- Backend APIs and financial calculations are unchanged.
- Route architecture, AppShell, navigation, forms, and tables are not redesigned.

Stop here for review.
