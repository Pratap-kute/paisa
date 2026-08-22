# Phase 6 Final — Modern UI Architecture Audit

Branch: `ui/08-hard-migration` (from `ui/redesign` through Phase 6.3)

Date: 2026-08-22

## Commit history by checkpoint

| Checkpoint | Commit | Message |
|---|---|---|
| Prereq | `61d812e` | merge: assets analysis migration (Phase 6.3) |
| CP0 | `7624631` | refactor(ui): harden migrated routes against legacy styling |
| CP1 | `b36fb61` | feat(ui): migrate liabilities and tax analysis |
| CP2 | `93d7cab` | feat(ui): migrate remaining overview routes |
| CP3 | `9abfdc4` | feat(ui): migrate remaining data explorers |
| CP4 | `b55c887` | feat(ui): migrate detail routes |
| CP5 | `81d4419` | feat(ui): migrate operational routes |
| CP6 | `88ebedb` | feat(ui): migrate configuration |
| CP7 | `33f6490` | feat(ui): migrate remaining tools |
| CP8 | `0a132e9` | feat(ui): consolidate application shell |
| CP9 | _(this commit)_ | chore(ui): audit modern styling architecture |

## Migrated route inventory (40 production routes)

| Archetype | Routes |
|---|---|
| Overview | `/`, `/liabilities/credit_cards`, `/more/goals` |
| Analysis | `/expense/monthly`, `/expense/yearly`, `/income`, `/cash_flow/monthly`, `/cash_flow/yearly`, `/cash_flow/income_statement`, `/assets/networth`, `/assets/balance`, `/assets/gain`, `/assets/investment`, `/assets/allocation`, `/assets/analysis`, `/liabilities/balance`, `/liabilities/interest`, `/liabilities/repayment`, `/more/tax/capital_gains`, `/more/tax/harvest` |
| Data Explorer | `/ledger/transaction`, `/ledger/posting`, `/ledger/price`, `/more/tax/schedule_al` |
| Workflow | `/ledger/import` |
| Detail | `/assets/gain/[slug]`, `/liabilities/credit_cards/[slug]`, `/more/goals/retirement/[slug]`, `/more/goals/savings/[slug]`, `/more/sheets/[slug]` |
| Operational | `/expense/budget`, `/cash_flow/recurring` |
| Configuration | `/more/config` |
| Tools | `/ledger/editor`, `/ledger/editor/[slug]`, `/more/about`, `/more/doctor`, `/more/logs`, `/more/sheets` |
| Auth | `/login` |
| Shell | AppShell sidebar + mobile drawer (all `(app)` routes) |

## Route-owned legacy styling

| Check | Count |
|---|---|
| Route-owned `lang="scss"` in `+page.svelte` | **0** |
| Route-owned `<style>` blocks in routes | **0** |
| Route-owned Bulma layout classes in route templates | **0** (false positives: `box-border`, `fa-table-columns`, Tabulator `columns` identifiers) |
| Raw palette utilities in routes | **5** (`ledger/import` prediction legend dots + drawer overlay — categorical visualization) |

## Remaining global/shared SCSS (Phase 7)

| File | Classification | Consumers |
|---|---|---|
| `styles/index.scss` | Global entry | `app.html` / root layout |
| `styles/base.scss` | Global reset | via `index.scss` |
| `styles/bulma-overrides.scss` | Bulma bridge | via `index.scss` |
| `styles/utilities.scss` | Legacy utilities | via `index.scss` |
| `styles/components/navbar.scss` | **Dead** (Navbar removed) | via `index.scss` — remove in Phase 7 |
| `styles/components/table.scss` | Tabulator/table bridge | global |
| `styles/components/chart.scss` | D3 chart integration | global |
| `styles/components/budget-card.scss` | Legacy card | `.budget-card` E2E + unmigrated class hooks |
| `styles/components/credit-card.scss` | Legacy card | detail/overview remnants |
| `styles/components/login.scss` | **Orphan** (import removed) | file remains, unused |
| `styles/vendor/codemirror.scss` | Vendor | editor routes |
| `styles/vendor/tabulator.scss` | Vendor | explorer routes |
| `styles/vendor/tippy.scss` | Vendor | tooltips globally |
| `theme-switcher.scss` | Theme animation | global |

Bulma package import remains in `styles/index.scss` (`bulma/css/bulma.min.css`).

## Phase 4 primitives still wrapping Bulma internally (Class C — Phase 7)

`Button`, `Badge`, `Field`, `Input`, `Select`, `Checkbox`, `Card`, `Table`, `Modal`, `MonthPicker`, `Tabs`, `Progress`, `LegendCard`, `BoxLabel`, `LevelItem` (deprecated, still referenced in tests).

Routes call Paisa components; they do not use raw Bulma in templates.

## `!important` count (application code)

| File | Count |
|---|---|
| `BulkEditForm.svelte` | 14 |
| `SearchQuery.svelte` | 6 |
| `LevelItem.svelte` | 1 |
| **Total** | **21** |

All in ledger search/bulk-edit integration layers (CodeMirror/Tabulator), not route-owned.

## Bits UI direct imports

Only in Paisa primitives: `Dialog.svelte`, `Drawer.svelte`, `Popover.svelte`. No route or domain component imports Bits UI directly.

## Components introduced / hardened (high level)

- `LiabilitiesBalance.svelte` (CP1)
- AppShell canonical IA + mobile drawer (CP8)
- `Actions.svelte` Tailwind dropdown (CP8)
- Hardened: `CapitalGainCard`, `CapitalGainDetailCard`, `CreditCardCard`, `GoalSummaryCard`, `BudgetCard`, `RecurringCard`/`Schedule`/`Day`, `JsonSchemaForm`, `InvestmentYearlyCard`, import subcomponents

## Repeated patterns consolidated

- `Page` + `PageHeader` + `MetricStrip`/`Metric` across analysis/operational routes
- `ChartFrame` + `ZeroState` for D3 routes
- `DataToolbar` / explorer filter bars for posting/price/schedule_al/transactions
- `FormField` + `FormSection` for configuration
- Dashboard grid `[&>:only-child]:col-span-full` for single surviving section rows

## Intentionally not abstracted

- Import route workspace grid (`ledger/import`) — unique three-pane workflow layout
- Editor three-column `grid-template-columns` — tool-specific workspace
- Interest analysis deep Tabulator row selectors — chart/table coupling
- Prediction confidence legend palette dots on import — categorical colors

## D3 / CodeMirror / Tabulator

| Integration | Status |
|---|---|
| D3 | Preserved; `isLoading=false` → `tick()` → init pattern applied; container-responsive sizing |
| CodeMirror | Preserved in editor + search; `vendor/codemirror.scss` retained |
| Tabulator | Preserved in transaction/posting/price/allocation/schedule_al; `vendor/tabulator.scss` retained |

## Tailwind Preflight

**OFF** — `foundation.css` imports only `tailwindcss/theme.css` and `tailwindcss/utilities.css` (no preflight/base).

## E2E baseline comparison

| | Baseline (`ui/redesign`) | Final (`ui/08-hard-migration`) |
|---|---|---|
| Passed | 75 / 81 | ~74–75 / 81 |
| Pre-existing failures | 4× `/dev/ui` smoke | 4× `/dev/ui` smoke (unchanged) |
| Navbar tests | 2× nested-menu (obsolete) | Replaced with sidebar expandable-group tests at 1024/1280 (pass) |
| New regressions | — | 0 classified (occasional `ledger-price` overflow timeout under parallel server load; passes in isolation) |

## Static verification (final)

```
deno task typecheck   → pass (0 errors)
deno task lint        → pass
deno task test:component → 39/39 pass
deno task build       → pass
```

## Phase 7 remaining work

1. Remove Bulma package + `bulma-overrides.scss` after primitive migration
2. Remove Sass package + remaining global SCSS files
3. Delete dead `navbar.scss`, orphan `login.scss`
4. Migrate Phase 4 primitives off internal Bulma (`Button`, `Field`, etc.)
5. Enable Tailwind Preflight
6. Remove `LevelItem` and remaining `!important` in SearchQuery/BulkEditForm
7. Replace raw palette legend dots on import with token-based categorical colors

## Explicit confirmations

- **master** untouched
- **ui/redesign** NOT merged to master
- **backend** unchanged
- **calculations** unchanged
- **route-owned SCSS** = 0
- **route-owned Bulma** = 0
- **no new SCSS** introduced in Phase 6 checkpoints
- **Tailwind Preflight** OFF
- **Phase 7** NOT started
