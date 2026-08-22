# Phase 7 Final — Legacy UI Decommission Audit

Branch: `ui/09-legacy-decommission` (from merged `ui/redesign` @ `234412c`)

Date: 2026-08-22

## Commit history by checkpoint

| Checkpoint     | Commit    | Message                                                       |
| -------------- | --------- | ------------------------------------------------------------- |
| CP1            | `fa14bec` | refactor(ui): remove Bulma dependencies from primitives       |
| CP2            | `70e2584` | refactor(ui): remove obsolete legacy components               |
| CP3            | `2e0dcda` | refactor(ui): replace remaining scss integrations with css    |
| CP4            | `dfca3f2` | refactor(ui): remove legacy important overrides               |
| CP5            | `b497e16` | refactor(ui): centralize remaining categorical colors         |
| CP6            | `077dcc8` | chore(ui): remove Bulma dependency                            |
| CP7            | `504aa0a` | chore(ui): remove Sass and SCSS infrastructure                |
| CP8            | `d074596` | feat(ui): enable Tailwind preflight                           |
| CP9            | `06fb39a` | fix(ui): resolve preflight regressions                        |
| CP10           | `3881d49` | test(ui): finalize redesigned application regression coverage |
| Report         | `9e1fd06` | docs(design): add phase 7 final audit report                  |
| CP10 follow-up | `4de4ae7` | test(ui): stabilize final regression coverage                 |

## Primitive migration / deletion inventory

| Primitive     | Action       | Notes                                                          |
| ------------- | ------------ | -------------------------------------------------------------- |
| `BoxLabel`    | **Deleted**  | 0 consumers                                                    |
| `LevelItem`   | **Deleted**  | Replaced by `Metric` in `GoalSummaryCard`                      |
| `Field`       | **Deleted**  | Call sites migrated to `FormField`                             |
| `Modal`       | **Deleted**  | Consumers migrated to `Dialog` (Bits UI)                       |
| `Checkbox`    | Migrated     | Native checkbox + token styles                                 |
| `Tabs`        | Migrated     | Tailwind tablist pattern                                       |
| `Progress`    | Migrated     | Native `<progress>` + tokens                                   |
| `Badge`       | Migrated     | `tone`/`size` variants in component CSS                        |
| `Button`      | Migrated     | `paisa-button-*` classes                                       |
| `Input`       | Migrated     | Removed Bulma `control`/`input` shell                          |
| `Select`      | Migrated     | Token-based select shell                                       |
| `Card`        | Migrated     | Token surface classes                                          |
| `LegendCard`  | Migrated     | Tailwind flex utilities                                        |
| `Table`       | Migrated     | No Bulma `box` wrapper                                         |
| `MonthPicker` | Migrated     | Popover-style dropdown                                         |
| `Dialog`      | **Extended** | Custom `header` snippet, `bodyClass`, `footerClass`, `onclose` |

## CSS integrations retained

| File                          | Purpose                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `foundation.css`              | Design tokens, Tailwind theme/utilities, **Preflight ON**, `paisa4-*` primitives                                       |
| `fonts.css`                   | `@font-face` and font loading                                                                                          |
| `legacy-compat.css`           | Semantic bridges for chart/tooltip HTML class names (`has-text-*`, `secondary-link`, `is-clipped`) — not Bulma package |
| `integrations/d3.css`         | D3 chart axes, legends, tooltips                                                                                       |
| `integrations/tabulator.css`  | Tabulator grid skin                                                                                                    |
| `integrations/codemirror.css` | CodeMirror editor skin                                                                                                 |
| `integrations/tooltip.css`    | Tippy.js tooltip skin + table tooltips                                                                                 |
| `theme-switcher.css`          | Theme transition animation                                                                                             |

Global `styles/index.scss` and all 14 application `.scss` files **deleted**.
`+layout.ts` loads only plain CSS.

## `!important` final count

| Location                      | Count | Status                                       |
| ----------------------------- | ----- | -------------------------------------------- |
| `SearchQuery.svelte`          | **0** | Target met (was 6)                           |
| `BulkEditForm.svelte`         | **0** | Target met (was 14)                          |
| `integrations/d3.css`         | 11    | Documented — D3 inline style override        |
| `integrations/codemirror.css` | 10    | Documented — vendor theme cascade            |
| `integrations/tooltip.css`    | 40    | Documented — Tippy default specificity       |
| `legacy-compat.css`           | 15    | Documented — chart HTML string class bridges |

**Application component `!important`:** 0 (target met).

## Raw palette final count

| Location                                                  | Count                                      |
| --------------------------------------------------------- | ------------------------------------------ |
| Route-owned raw Tailwind palette (`bg-emerald-500`, etc.) | **0**                                      |
| Import legend dots                                        | **0** — uses `--paisa-prediction-*` tokens |
| `SourceReviewList` indicators                             | **0** — migrated to prediction tokens      |

## Bulma / Sass removal

| Check                                                  | Result      |
| ------------------------------------------------------ | ----------- |
| `bulma` in `deno.json`                                 | **Removed** |
| `sass` in `deno.json`                                  | **Removed** |
| `styles/index.scss` Bulma import                       | **Deleted** |
| Application `.scss` files under `frontend/src/styles/` | **0**       |
| Vite Sass preprocessor config                          | **Removed** |

**Note:** 21 Svelte components retain `lang="scss"` on scoped `<style>` blocks
(nested selectors). These compile via Vite's transitive Sass dependency and
contain no Bulma imports. Converting to plain CSS is optional follow-up.

## Legacy class bridges (`legacy-compat.css`)

Bulma **package** is gone. Chart formatters and tooltip HTML still emit
historical class names (`has-text-success`, etc.). `legacy-compat.css` maps
these to `--paisa-*` tokens. This is intentional until chart HTML is migrated to
semantic markup.

## Tailwind Preflight

**ON** — `foundation.css` line 7:

```css
@import "tailwindcss/preflight.css" layer(base);
```

### Preflight regressions found / fixed

| Area                                    | Fix                                             |
| --------------------------------------- | ----------------------------------------------- |
| `Button`, `Input`, `Select`, `Checkbox` | Explicit `margin: 0`, `appearance`, focus rings |
| `Field` → `FormField`                   | Label/control spacing hardened before deletion  |
| `PageHeader`                            | Heading margin reset                            |
| Tabulator headers                       | Integration CSS geometry preserved              |

Fixes applied at primitive/foundation layer, not route patches.

## E2E / visual validation

| Suite                                  | Result                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `deno task typecheck`                  | Pass (0 errors)                                                                                              |
| `deno task lint`                       | Pass                                                                                                         |
| `deno task test:component`             | **37/37** pass (2 tests removed with `LevelItem`)                                                            |
| `deno task build`                      | Pass                                                                                                         |
| `deno task test:e2e`                   | **80 passed, 1 skipped** (`/dev/ui` production-mode assertion is skipped when the dev-ui E2E flag is active) |
| `deno task test:visual`                | **170/170** pass (160 route screenshots + 10 chart crops)                                                    |
| Visual matrix (40 routes × 4 variants) | **160/160** pass; snapshots refreshed and reviewed for the Preflight baseline                                |

### Test selector migrations (CP10)

| Legacy                            | Replacement                                        |
| --------------------------------- | -------------------------------------------------- |
| `.budget-card`                    | `data-testid="budget-card"`                        |
| `p.is-6`                          | `getByText(/\d+ transaction\(s\)/)`                |
| `button.save`                     | `getByRole('button', { name: /Save to Ledger/i })` |
| `.secondary-link`                 | Role/link within posting table                     |
| Bulma color classes in unit tests | `paisa-text-*` semantic tokens                     |

Additional CP10 stabilization:

- Added shared browser navigation assertions for desktop/mobile shell checks.
- Reworked import, budget, price, transaction, recurring, liabilities, and chart
  visual readiness selectors around user-facing headings/roles instead of legacy
  Bulma classes.
- Stubbed `/api/price` in price-focused browser and visual tests to remove
  network/cache timing from layout assertions.
- Refreshed the 160-route visual baseline plus 10 chart-crop snapshots after CP9
  Preflight fixes.

### Dev UI strategy

`/dev/ui` returns 404 in production preview unless `VITE_PAISA_E2E_DEV_UI=true`.
`test_server.ts` builds with this flag so `dev-ui.spec.ts` runs against preview
in CI.

### Ledger-price flake

`layout.spec.ts` stubs `GET /api/price` to a deterministic empty price payload
before the overflow assertion on `/ledger/price`.

## Functional smoke areas (§29)

Covered by full E2E and the 160-route visual matrix; manual exploratory review
remains recommended immediately before master cutover:

- Dashboard drilldowns
- Transactions search / bulk / diff / export
- Import preview / save
- Editor save / validate
- Config all 11 sections
- Goals reorder
- Credit card detail
- Chart legends / tooltips
- AppShell drawer / actions

## Readiness for master cutover

| Criterion                  | Status        |
| -------------------------- | ------------- |
| Routes (40) Bulma-free     | Yes           |
| Primitives Bulma-free      | Yes           |
| Bulma npm package          | Removed       |
| Global SCSS infrastructure | Removed       |
| Preflight                  | Enabled       |
| Backend / calculations     | Unchanged     |
| **master** branch          | **Untouched** |

## Explicit confirmations

- **master** untouched
- **backend/calculations** unchanged
- **Bulma package** = 0
- **Application SCSS files** = 0 (global); scoped `lang="scss"` remains in 21
  components
- **Sass direct dependency** = 0
- **Preflight** = ON
- **STOP before merging to master**
