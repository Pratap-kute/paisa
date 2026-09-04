# Paisa UI/UX Specification — As-Built Reference

> **Document Status:** As-Built Reference Specification (Post-Migration)  
> **Current Stack:** Svelte 5 + SvelteKit 2 + Tailwind CSS v4 + Bits UI + ECharts 6  
> **Source-of-Truth Priority:** Existing Paisa Business Logic & Functionality > Existing Route/Component Code > Existing Workflows > This Specification > Visual Mockups  
> **Canonical File:** `docs/design/paisa-ui-spec.md`

---

## 1. Executive Summary & Design Philosophy

Paisa is a desktop-first, local-first personal finance management system built on plain-text double-entry accounting (hledger/ledger journal format). It serves power users, investors, and disciplined individuals who require rigorous, accurate, and deep financial tracking without third-party cloud lock-in.

### 1.1 The Core Design Philosophy

> **"Paisa is a focused financial workspace: data first, controls second, decoration last. Complexity is revealed progressively instead of being shown all at once."**

### 1.2 The Twelve Design Principles

1. **Financial information is the interface:** Numbers, charts, account trees, and ledger entries are the primary content. UI chrome (borders, backgrounds, decorative containers, excessive padding) exists only to group and clarify financial data, never to decorate empty space.
2. **Reveal complexity progressively:** Simple questions have immediate answers (e.g., net worth, monthly spending total). Deeper details (multi-currency breakdown, tax harvesting lots, statement raw cells, transaction postings) are accessible via secondary disclosure, inspectors, tabs, or modal dialogs.
3. **One page should answer one primary financial question:** Every screen has a single core responsibility (e.g., "Where did my money go this month?", "Is my journal mathematically balanced?", "Am I on track for retirement?").
4. **Strong hierarchy, weak decoration:** Establish hierarchy through typography scale, font weight, spacing, and contrast rather than heavy colored backgrounds or deep box shadows.
5. **Surfaces represent meaning:** Surface elevation and background shifts represent semantic grouping or actionable boundaries, not arbitrary styling.
6. **Avoid card soup:** A card exists *only* when an element is a distinct entity, independently actionable, independently selectable, or semantically grouped. Never wrap individual fields, charts, or KPIs in isolated cards if spacing, alignment, and subtle dividers can group them cleanly.
7. **Financial work should remain information-dense:** Users with large ledgers require high information density. Desktop views prioritize compact vertical rhythm, dense data grids, right-aligned tabular numbers, and full workspace utilization.
8. **Missing data must never break composition:** Financial states frequently encounter zero transactions, single data points, missing price feeds, unconfigured goals, or empty categories. Every layout must be resilient under 0, 1, 2, or 10,000+ items without layout shifts or geometry collapse.
9. **Interaction patterns should be predictable:** Common actions (filtering, sorting, date ranges, search, saving, keyboard shortcuts) must behave identically across all pages.
10. **Mobile prioritizes and reorganizes rather than shrinking desktop:** Mobile views transform multi-pane layouts into dedicated tabs, drawers, and vertical priority stacks with touch targets $\ge 44\text{px}$, rather than squeezing desktop tables into unreadable widths.
11. **Implementation simplicity is a design quality:** Standardize UI primitives, layout containers, and color tokens so future features can be constructed from existing building blocks without inventing custom ad-hoc CSS.
12. **Do not invent product functionality for visual completeness:** Never include mock UI features (e.g., payment gateways, bank logins, arbitrary SaaS widgets, AI match badges in standard views) unless they are backed by Paisa's real engine. Actual Paisa functionality always wins over external design mockups.

---

## 2. Technology & Architecture Direction

The Paisa frontend uses modern styling and component ergonomics while preserving the proven application core.

### 2.1 Core Framework

- **Framework:** Svelte 5 with SvelteKit 2.
- **State Management:** Svelte 5 Runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) and existing persisted Svelte stores (`store.ts`, `persisted_store.ts`).

### 2.2 Styling Direction

- **CSS Engine:** Tailwind CSS v4 + native CSS custom properties.
- **Token System:** Semantic CSS variables defined in `:root` and `[data-theme="dark"]`, mapped into Tailwind via `@theme inline`. Centralized in `$lib/shared/styles/foundation.css` (primary Tailwind integration point and canonical tokens) and `$lib/shared/theme/tokens.css` (extended token superset and integration mappings).
- **Three Token Tiers:**
  1. **Canonical Tokens:** Permitted for all new application components and views (`--paisa-canvas`, `--paisa-surface`, `--paisa-surface-raised`, `--paisa-surface-hover`, `--paisa-foreground`, `--paisa-muted-foreground`, `--paisa-border`, `--paisa-primary`, `--paisa-positive`, `--paisa-negative`, `--paisa-warning`, `--paisa-neutral`, `--paisa-prediction-*`).
  2. **Compatibility Tokens:** Retained for third-party vendor integrations (CodeMirror, Tabulator, svelte-select), chart SVG rendering, and legacy DOM compatibility bridges (`--paisa-table-*`, `--paisa-input-*`, `--paisa-chart-*`, `--paisa-text-primary`, `--paisa-text-secondary`, `--paisa-text-muted`, `--paisa-surface-bg`, `--paisa-canvas-bg`).
  3. **Deprecated Tokens:** Prohibited in new application code and slated for incremental migration (`--paisa-success`, `--paisa-success-light`, `--paisa-danger`, `--paisa-danger-light`, `--paisa-info`, `--paisa-info-light`, `--paisa-brand-primary`). Application code representing financial statuses must use canonical financial semantics (`positive`, `negative`, `warning`, `primary`).
- **CSS Layer Architecture:** Styles are organized via `@layer theme, base, components, utilities;` for controlled specificity.
- **Migration Status (Complete):**
  $$\text{Bulma} = 0 \quad\big|\quad \text{Sass/SCSS} = 0 \quad\big|\quad \text{!important} \approx 0$$
  Bulma and SCSS have been fully removed. Tailwind CSS v4 Preflight is **enabled** (`@import "tailwindcss/preflight.css" layer(base)`). A thin `legacy-compat.css` bridge provides class aliases (e.g., `.has-text-success`, `.table.is-hoverable`) consumed by Tabulator and legacy DOM output. No new Bulma-style classes may be added.

### 2.3 UI Primitives & Accessibility Layer

- **Component Ownership:** All application routes import Paisa-owned Svelte UI components located in `$lib/shared/ui/` or `$lib/shared/layout/`.
- **Bits UI Boundary:** Bits UI is utilized internally under the hood of Paisa UI primitives (e.g., `$lib/shared/ui/Dialog.svelte`, `$lib/shared/ui/Tabs.svelte`, `$lib/shared/ui/Dropdown.svelte`) to guarantee WAI-ARIA compliance, keyboard navigation, and focus trapping.
- **Encapsulation Guarantee:** Domain components and SvelteKit routes **must never** import Bits UI directly. All interactions go through Paisa's own typed props and slots/snippets.

### 2.4 Visualization & Specialized Engines

- **ECharts 6:** All financial data visualizations (timelines, bar charts, comparison bars, waterfall charts, sankey flows, sunbursts, treemaps, hierarchies). Charts are rendered via `<EChartSurface />` with built-in `ResizeObserver` lifecycle management. Higher-level wrappers include `<TimeSeriesChart />`, `<ComparisonBarChart />`, and `<FinancialHierarchyChart />`. Chart data transforms and option builders live in `$lib/shared/charts/echarts/`. D3.js has been fully removed.
- **CodeMirror 6:** Retained for ledger journal editing, sheet expression evaluation, and template editing.
- **Tabulator Tables:** Retained behind the `<Table />` wrapper boundary for complex data-dense grids. Replacement with native/virtualized table engines is a decoupled future concern.

---

## 3. Semantic Design Tokens & Theme System

To ensure long-term maintainability and visual harmony across light and dark modes, all styling relies on a compact, stable set of semantic tokens. Unnecessary aliases that resolve to the same semantic role are avoided.

New application code must strictly use **Canonical Tokens** via Tailwind semantic utility classes (`bg-surface`, `text-foreground`, `text-muted-foreground`, `text-positive`, `text-negative`, `border-border`) rather than direct CSS variable lookups or deprecated status aliases.

### 3.1 Token Definitions

```css
:root {
  /* Canvas & Surfaces */
  --paisa-canvas: #f8fafc;
  --paisa-surface: #ffffff;
  --paisa-surface-raised: #f1f5f9;
  --paisa-surface-hover: #e2e8f0;

  /* Typography & Foreground */
  --paisa-foreground: #0f172a;
  --paisa-muted-foreground: #64748b;
  --paisa-inverse-foreground: #ffffff;

  /* Borders & Dividers */
  --paisa-border: #e2e8f0;
  --paisa-border-subtle: #f1f5f9;
  --paisa-border-strong: #cbd5e1;

  /* Financial & Status Semantics */
  --paisa-primary: #2563eb;
  --paisa-primary-subtle: #eff6ff;
  --paisa-positive: #16a34a;
  --paisa-positive-subtle: #f0fdf4;
  --paisa-negative: #dc2626;
  --paisa-negative-subtle: #fef2f2;
  --paisa-warning: #d97706;
  --paisa-warning-subtle: #fffbeb;
  --paisa-neutral: #475569;

  /* Prediction Confidence */
  --paisa-prediction-high: #10b981;
  --paisa-prediction-medium: #3b82f6;
  --paisa-prediction-review: #f59e0b;
  --paisa-prediction-unknown: #f43f5e;
  --paisa-prediction-transfer: #8b5cf6;

  /* Elevation Shadows */
  --paisa-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --paisa-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --paisa-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);

  /* Radius Scale */
  --paisa-radius-sm: 4px;
  --paisa-radius-md: 6px;
  --paisa-radius-lg: 8px;
  --paisa-radius-full: 9999px;

  /* Transitions */
  --paisa-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --paisa-transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  /* Canvas & Surfaces */
  --paisa-canvas: #0b0f17;
  --paisa-surface: #18202d;
  --paisa-surface-raised: #1f2937;
  --paisa-surface-hover: #273549;

  /* Typography & Foreground */
  --paisa-foreground: #f8fafc;
  --paisa-muted-foreground: #94a3b8;
  --paisa-inverse-foreground: #0f172a;

  /* Borders & Dividers */
  --paisa-border: #2e3c51;
  --paisa-border-subtle: #1e293b;
  --paisa-border-strong: #475569;

  /* Financial & Status Semantics */
  --paisa-primary: #3b82f6;
  --paisa-primary-subtle: #1e293b;
  --paisa-positive: #22c55e;
  --paisa-positive-subtle: #064e3b;
  --paisa-negative: #ef4444;
  --paisa-negative-subtle: #450a0a;
  --paisa-warning: #f59e0b;
  --paisa-warning-subtle: #451a03;
  --paisa-neutral: #94a3b8;

  /* Prediction Confidence */
  --paisa-prediction-high: #34d399;
  --paisa-prediction-medium: #60a5fa;
  --paisa-prediction-review: #fbbf24;
  --paisa-prediction-unknown: #fb7185;
  --paisa-prediction-transfer: #a78bfa;

  /* Elevation Shadows */
  --paisa-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
  --paisa-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
  --paisa-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
}
```

### 3.2 Tailwind CSS v4 Theme Mapping

```css
@theme inline {
  --color-canvas: var(--paisa-canvas);
  --color-surface: var(--paisa-surface);
  --color-surface-raised: var(--paisa-surface-raised);
  --color-surface-hover: var(--paisa-surface-hover);

  --color-foreground: var(--paisa-foreground);
  --color-muted-foreground: var(--paisa-muted-foreground);
  --color-inverse-foreground: var(--paisa-inverse-foreground);

  --color-border: var(--paisa-border);
  --color-border-subtle: var(--paisa-border-subtle);
  --color-border-strong: var(--paisa-border-strong);

  --color-primary: var(--paisa-primary);
  --color-primary-subtle: var(--paisa-primary-subtle);
  --color-positive: var(--paisa-positive);
  --color-positive-subtle: var(--paisa-positive-subtle);
  --color-negative: var(--paisa-negative);
  --color-negative-subtle: var(--paisa-negative-subtle);
  --color-warning: var(--paisa-warning);
  --color-warning-subtle: var(--paisa-warning-subtle);
  --color-neutral: var(--paisa-neutral);
  --color-prediction-high: var(--paisa-prediction-high);
  --color-prediction-medium: var(--paisa-prediction-medium);
  --color-prediction-review: var(--paisa-prediction-review);
  --color-prediction-unknown: var(--paisa-prediction-unknown);
  --color-prediction-transfer: var(--paisa-prediction-transfer);

  --font-sans: var(--paisa-font-ui);
  --font-mono: var(--paisa-font-code);

  --radius-sm: var(--paisa-radius-sm);
  --radius-md: var(--paisa-radius-md);
  --radius-lg: var(--paisa-radius-lg);
  --radius-full: var(--paisa-radius-full);

  --shadow-sm: var(--paisa-shadow-sm);
  --shadow-md: var(--paisa-shadow-md);
  --shadow-lg: var(--paisa-shadow-lg);
}
```

### 3.3 Semantic Utility Classes Rule

Components and views must use semantic utility classes (`bg-surface`, `text-foreground`, `text-muted-foreground`, `text-positive`, `text-negative`, `border-border`). Direct use of raw color utilities (such as `text-red-500`, `bg-blue-600`, `bg-gray-100`) in application code is strictly forbidden.

---

## 4. Typography System

Paisa standardizes on **Inter** for all UI copy, navigation, forms, and financial metrics. **JetBrains Mono** is reserved strictly for monospace contexts. (*Hanken Grotesk* is deprecated and forbidden).

### 4.1 Font Families

- **Primary UI Font (`--paisa-font-ui` / `--paisa-font-sans`):** `"Inter Variable", Inter, "fa6-solid", "fa6-regular", "fa6-brands", "arcticons", "fluent-emoji-high-contrast", "mdi", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` — the font stack includes icon font families for inline icon rendering via CSS class selectors.
- **Monospace Font (`--paisa-font-code` / `--paisa-font-mono`):** `"JetBrains Mono Variable", "JetBrains Mono", monospace` (Used exclusively in: Ledger Editor, CodeMirror Template Editor, Generated Ledger Previews, Raw Transaction IDs, Posting syntax).

### 4.2 Typographic Hierarchy Scale

| Role | Font Size | Line Height | Weight | Letter Spacing | Numeric Setting |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 24px (`1.5rem`) | 30px | 600 (Semibold) | `-0.02em` | Normal |
| **Primary Financial KPI** | 28px–32px (`1.75–2.0rem`) | 36px | 600 (Semibold) | `-0.02em` | `tabular-nums` |
| **Section Heading** | 16px (`1.0rem`) | 24px | 600 (Semibold) | `-0.01em` | Normal |
| **Subsection / Card Title** | 14px (`0.875rem`) | 20px | 600 (Semibold) | `0` | Normal |
| **Body Text / Controls** | 14px (`0.875rem`) | 20px | 400 (Regular) / 500 (Medium) | `0` | Normal |
| **Secondary Metadata** | 13px (`0.8125rem`) | 18px | 400 (Regular) | `0` | `tabular-nums` |
| **Caption / Badge / Tag** | 12px (`0.75rem`) | 16px | 500 (Medium) | `+0.02em` | `tabular-nums` |
| **Micro / Subscript** | 11px (`0.6875rem`) | 14px | 500 (Medium) | `+0.04em` | Normal |

### 4.3 Tabular Numeric Guarantee

All financial amounts, quantities, percentage changes, dates, and account codes must render with:

```css
font-variant-numeric: tabular-nums;
```

This guarantees alignment across rows, lists, and summary columns. Amounts must never wrap onto multiple lines or split across currency symbols.

---

## 5. Spacing, Sizing, and Layout Scale

### 5.1 Canonical 8-Point Spacing Scale

The spacing scale is strictly based on standard multiples:
$$\text{Scale: } [4\text{px}, 8\text{px}, 12\text{px}, 16\text{px}, 24\text{px}, 32\text{px}, 48\text{px}, 64\text{px}]$$

- `space-1` (4px): Micro gaps between icons and labels, inner badge padding.
- `space-2` (8px): Control inner padding, list item gaps, compact toolbar spacing.
- `space-3` (12px): Standard element gaps, metric item padding.
- `space-4` (16px): Card padding, section internal gaps, grid column gaps.
- `space-5` (24px): Inter-section spacing, major page block separation.
- `space-6` (32px): Page header to content spacing, major workspace division.
- `space-7` (48px): Hero section separation, empty state vertical breathing room.
- `space-8` (64px): Extreme top/bottom boundary padding.

### 5.2 Control Sizing Standards

- **Compact Desktop (Dense Workspaces / Editor Toolbars / Tables):** Height $\approx 32\text{px}$ (`h-8`), font size 13px.
- **Normal Desktop (Forms / Standard Buttons / Dropdowns):** Height $\approx 36\text{px}–40\text{px}$ (`h-9` / `h-10`), font size 14px.
- **Mobile Touch Targets:** Minimum interactive dimension $\ge 44\text{px}$ (`min-h-[44px] min-w-[44px]`).

### 5.3 Page Width Container Archetypes

- **Standard / Configuration / Forms:** Content constrained to $800\text{px}–960\text{px}$ (`max-w-4xl` to `max-w-5xl`) to prevent overly wide input fields.
- **Analysis Views (Monthly Expenses, Cash Flow, Net Worth):** Constrained to $1200\text{px}–1400\text{px}$ (`max-w-7xl`).
- **Data Explorers / Multi-Pane Workspaces (Transactions, Import, Editor, Sheets):** Fluid full-width workspace with controlled minimal gutters.
- **Dashboard:** Fluid layout with controlled maximum visual width of $1600\text{px}$.

### 5.4 Visual Baselines

- **Desktop Reference:** $1440\text{px} \times 900\text{px}$.
- **Mobile Reference:** $390\text{px} \times 844\text{px}$ (iPhone standard). Mobile views may scroll vertically as needed; never attempt to eliminate mobile vertical scrolling by artificially widening the viewport.

---

## 6. Surface Hierarchy & Anti-Card-Soup Policy

A common failure in financial UI redesigns is creating "card soup"—wrapping every standalone number, chart, field, and button inside a rounded rectangular box with shadows. Paisa explicitly strictly forbids this.

### 6.1 The Four-Tier Surface Model

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canvas Background (var(--paisa-canvas))                  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 2. Page Container (transparent or soft bounded)     │   │
│   │                                                     │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │ 3. Section Boundary (Header + Spacing)      │   │   │
│   │   │                                             │   │   │
│   │   │   ┌─────────────────────────────────────┐   │   │   │
│   │   │   │ 4. Actionable Surface / Data Entity │   │   │   │
│   │   │   │    (Table / Dense List / Panel)     │   │   │   │
│   │   │   └─────────────────────────────────────┘   │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 The Container Justification Rule

A surface container (Card / Box / Panel) is evaluated by its **visual and surface semantics** (elevation, shadows, outer bounding borders) rather than mere Svelte component file naming. A container is **permitted** when at least one of the following criteria is met:

1. It encapsulates a **distinct financial entity** with its own identity (e.g., a specific Goal, a Recurring Bill item).
2. It represents an **independently actionable or selectable** element (e.g., a clickable transaction record in mobile view).
3. It bounds a **dense interactive workspace** (e.g., the CodeMirror editor pane, a spreadsheet preview grid).
4. It isolates a **multi-field complex form section**.
5. It encloses a **complex data table** requiring explicit overflow clipping (`overflow-x-auto`), sticky headers, scroll boundaries, or expandable detail panels. Where a simple section surface with hairline dividers suffices, prefer direct placement; do not, however, prohibit functional table containers.

### 6.3 Separation Hierarchy & Surface Elevation Semantics

When separating content, apply techniques in this strict order:
$$\text{1. Spacing} \longrightarrow \text{2. Alignment} \longrightarrow \text{3. Typography Hierarchy} \longrightarrow \text{4. Hairline Dividers} \longrightarrow \text{5. Backgrounds / Cards}$$

- **No Chart Enclosures:** Charts do not automatically need wrapping cards; they live directly on section surfaces.
- **Unified Metric Strips:** Metric strips do not need individual card enclosures for each number; they sit cleanly inside a unified horizontal strip with subtle vertical dividers.
- **Nested Elevated Cards are Forbidden:** Placing an elevated, shadowed card inside another elevated, shadowed card is strictly forbidden.
- **Expandable Detail Panels are Permitted:** An inner bordered table or expandable row inspector (such as `CapitalGainDetailCard` rendering inside an expanded table row) is a functional drill-down region on `var(--paisa-surface-raised)` with hairline borders, not an elevated card-in-card violation.

---

## 7. Financial Color Semantics

In double-entry personal finance, naive color associations (e.g., "all income is green, all expenses are red") create misleading user interfaces. Paisa applies a semantic financial color model based on *meaning and contextual outcome*.

### 7.1 Semantic Roles

| Token | Semantic Purpose | When Used | When NOT Used |
| :--- | :--- | :--- | :--- |
| **`var(--paisa-positive)`** | Financial Improvement / Surplus | Net investment gain, income surplus, goal completion, cleared transaction, balance increase in assets. | Outflow transactions, ordinary transfers between asset accounts. |
| **`var(--paisa-negative)`** | Financial Deterioration / Deficit / Error | Investment loss, budget deficit, past-due payment, parse error, syntax violation, severe account overdraft. | Ordinary planned expenses within budget, tax withholding. |
| **`var(--paisa-warning)`** | Needs Attention / Review Required | Transaction prediction with medium confidence, upcoming due date within 3 days, unsaved changes dirty state, budget threshold exceeded. | Fatal errors, normal transactions. |
| **`var(--paisa-primary)`** | Selection / Focus / Navigation | Active route, primary CTA button, selected table row, active editor tab, focused input ring. | Financial value status (gain/loss). |
| **`var(--paisa-neutral)`** | Neutral Information / Facts | Standard currency values, asset balance, credit card statement total, ledger posting accounts. | Status alarms or urgent action prompts. |
| **`var(--paisa-muted-foreground)`** | Supporting / Historical Context | Relative dates ("3 days ago"), transaction notes, file paths, commodity symbols, column headers. | Primary financial numbers. |
| **Categorical Colors** | Multi-class distinction | ECharts category breakdowns, asset allocation pie/sunburst slices, cash flow flowline distinctions. | Text status badges. |

### 7.2 Sign vs. Context Rules

- An expense of ₹5,000 is an ordinary fact; display in neutral foreground with category accent. Only display in **`var(--paisa-negative)`** if it causes a budget deficit or violates an operational threshold.
- A credit card payment of ₹25,000 from Checking to Credit Card is an asset-to-liability transfer; render with neutral transfer styling, not loss or gain.

---

## 8. Global Information Architecture & Navigation

The navigation system organizes Paisa's routes into a clean, hierarchical sidebar structure on desktop that transforms into an accessible drawer on mobile.

```
┌─────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                    │
│   Dashboard (/)                                             │
│   Insights (/insights)                                      │
├─────────────────────────────────────────────────────────────┤
│ MONEY (Expandable Group)                                    │
│   ▾ Cash Flow                                               │
│       Income Statement (/cash_flow/income_statement)        │
│       Monthly (/cash_flow/monthly)                          │
│       Yearly (/cash_flow/yearly)                            │
│       Recurring (/cash_flow/recurring)                      │
│   Income (/income)                                          │
│   ▾ Expenses                                                │
│       Monthly (/expense/monthly)                            │
│       Yearly (/expense/yearly)                              │
│       Budget (/expense/budget)                              │
├─────────────────────────────────────────────────────────────┤
│ WEALTH (Expandable Group)                                   │
│   ▾ Assets                                                  │
│       Balance (/assets/balance)                             │
│       Net Worth (/assets/networth)                          │
│       Investment (/assets/investment)                       │
│       Gain (/assets/gain)                                   │
│       Allocation (/assets/allocation)                       │
│       Analysis (/assets/analysis)                           │
│   ▾ Liabilities                                             │
│       Balance (/liabilities/balance)                        │
│       Credit Cards (/liabilities/credit_cards)              │
│       Repayment (/liabilities/repayment)                    │
│       Interest (/liabilities/interest)                      │
│   Goals (/more/goals)                                       │
├─────────────────────────────────────────────────────────────┤
│ LEDGER                                                      │
│   Transactions (/ledger/transaction)                        │
│   Import (/ledger/import)                                   │
│   Editor (/ledger/editor)                                   │
│   Postings (/ledger/posting)                                │
│   Prices (/ledger/price)                                    │
├─────────────────────────────────────────────────────────────┤
│ TAX (Conditionally visible when USER_CONFIG.currency == INR)│
│   Tax Capital Gains (/more/tax/capital_gains)               │
│   Tax Harvest (/more/tax/harvest)                           │
│   Schedule AL (/more/tax/schedule_al)                       │
├─────────────────────────────────────────────────────────────┤
│ TOOLS                                                       │
│   Sheets (/more/sheets)                                     │
├─────────────────────────────────────────────────────────────┤
│ SYSTEM / BOTTOM                                             │
│   Configuration (/more/config)                              │
│   ▾ System (Expandable Group)                               │
│       Doctor (/more/doctor)                                 │
│       Logs (/more/logs)                                     │
│   About (/more/about)                                       │
└─────────────────────────────────────────────────────────────┘
```

### 8.1 Non-Route Expandable Groups Rule

In the current repository, `Cash Flow`, `Expenses`, `Assets`, `Liabilities`, and `System` do not have standalone index page routes (`+page.svelte`). They are strictly **non-route expandable navigation groups** whose children are the real routes. When a route within a group is active, the parent group is automatically expanded.

### 8.2 Global Command Palette

The global shortcut (`Ctrl+K` / `Cmd+K`) opens the **Command Palette** (`$lib/shared/layout/CommandPalette.svelte`), providing instant fuzzy search across four categories: **Navigation** (all routes), **Actions** (sync, theme toggle, price update), **Accounts** (jump to account-specific views), and **Search** (transaction queries). The palette supports keyboard navigation, Mac-aware shortcut display, and responsive design.

---

## 9. AppShell & Page Anatomy

The application shell provides global context, synchronous feedback, and navigation while keeping out of the way of page-level data.

### 9.1 Desktop AppShell Composition

```
┌──────────────────┬───────────────────────────────────────────────────────────┐
│ [Logo] Paisa     │ [Search / Quick Jump...]             [Sync] [Theme] [...] │
├──────────────────┼───────────────────────────────────────────────────────────┤
│ Navigation       │ PAGE HEADER (Breadcrumb / Title / Help / Actions)         │
│ Item 1           ├───────────────────────────────────────────────────────────┤
│ Item 2           │ SUBTOOLBAR (Date Range / Month Picker / Depth Slider)     │
│ ▾ Group          ├───────────────────────────────────────────────────────────┤
│     Child A      │                                                           │
│     Child B      │ PAGE CONTENT (Fluid or Standard Width Container)          │
│                  │                                                           │
│ ───────────────  │                                                           │
│ System / Config  │                                                           │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

### 9.2 Header Actions & Utility Controls

The AppShell header right region hosts:

1. **Readonly Badge:** Visible only when `USER_CONFIG.readonly === true`.
2. **Theme Switcher:** Toggles light / dark mode.
3. **Actions Menu (`...`):**
   - *Sync Journal* (re-reads ledger file from disk)
   - *Update Prices* (fetches commodity price quotes)
   - *Update Mutual Fund Portfolios* (fetches MF portfolio allocations)
   - *Hide/Show numbers* (toggles the `$obscure` privacy mode)
   - *Logout* (when authenticated)

### 9.3 PageHeader Responsibility Guarantee

The global AppShell header **never** contains a static page title (such as "Dashboard" or "Paisa"). Page headers follow an explicit archetype rule:

- **Standard Routes (Overview, Analysis, Detail, Operational, Data Explorer):** Every route renders its own `<PageHeader />` component containing:
  - Specific page title
  - Optional subtitle / description
  - Direct documentation link (`helpUrl(...)`)
  - Page-level primary actions snippet (e.g., Period Picker, Last N Months, Export, Create Button)
- **Specialized Workspaces (Tool and Workflow Archetypes):** Routes such as `/ledger/editor`, `/ledger/editor/[slug]`, and `/ledger/import` use an approved specialized workspace toolbar or topbar in place of the generic `<PageHeader />` when primary interactive controls form the page header itself. A redundant generic PageHeader above these workspaces is strictly avoided.

---

## 10. Core Page Archetypes & Wireframes

Every page in Paisa maps strictly to one of eight core archetypes. An implementation agent must never invent a new layout structure.

---

### Archetype A: Overview

- **Purpose:** Answer a broad financial status question with high-level summary signals and directional indicators.
- **Primary Question:** *"What is my financial position, and what requires my attention right now?"*
- **Examples:** `/` (Dashboard), `/liabilities/credit_cards` (Overview), `/more/goals` (Goals Overview).
- **Desktop Pattern:**
  1. `PageHeader` (Title + global actions)
  2. `MetricStrip` (Net Worth, Cash Balance, Expenses, Budget — no individual card enclosures; includes trend and secondary status)
  3. Cash Accounts — compact horizontal summaries
  4. Insights Gateway banner — directional anomaly and savings insights
  5. Visualizations row (Cash Flow timeline | Spending breakdown)
  6. Operations row (Needs Attention / Budget Health | Recent Activity)
  7. Long-term summary row (Goals | Upcoming / Recurring)
- **Mobile Transformation:** Ordered stack: Net Worth $\rightarrow$ secondary metrics $\rightarrow$ Cash Accounts $\rightarrow$ Insights $\rightarrow$ Cash Flow $\rightarrow$ Spending $\rightarrow$ Needs Attention $\rightarrow$ Recent Activity $\rightarrow$ Goals $\rightarrow$ Upcoming / Recurring.
- **Prohibited Patterns:** Do not wrap individual KPI numbers in isolated cards. Do not render large decorative bank card graphics.

#### Wireframe: Dashboard Desktop

```
+-----------------------------------------------------------------------------------------------+
| Dashboard                    Your financial position at a glance                [Last 30 Days]|
+-----------------------------------------------------------------------------------------------+
| NET WORTH: ₹84,20,500  | CASH BALANCE: ₹2,39,400 | EXPENSES: ₹78,420    | BUDGET: On Track    |
| ▲ +₹2.2L (+3.2%) MoM   | Across 3 accounts       | Projected ₹82,000    | ₹78k of ₹1.1L spent |
+-----------------------------------------------------------------------------------------------+
| Cash Accounts:  HDFC Checking: ₹1,42,000  ·  ICICI Savings: ₹85,400  ·  Cash Wallet: ₹12,000  |
+-----------------------------------------------------------------------------------------------+
| [i] INSIGHTS: Dining spending +24% vs rolling median  ·  Savings rate at 42%    [View Insights]|
+-------------------------------------------------------------+---------------------------------+
| CASH FLOW                                                   | SPENDING (Jul 2026)             |
| [=================== ECharts Monthly Flow Chart ===============] | Total: ₹78,420                  |
|                                                             | Shopping    ████████████  ₹32k  |
|                                                             | Groceries   ████████      ₹21k  |
|                                                             | Utilities   ████          ₹11k  |
+-------------------------------------------------------------+---------------------------------+
| NEEDS ATTENTION                                             | RECENT ACTIVITY                 |
| Fuel Budget: ₹5,400 / ₹5,000 (Over by ₹400)                 | Amazon           -₹1,249  18 Aug|
| Freedom Card Due: 20 Aug (₹42,500)                          | Salary HDFC    +₹1,85,000 01 Aug|
+-------------------------------------------------------------+---------------------------------+
| GOALS                                                       | UPCOMING / RECURRING            |
| Retirement: 68% of ₹2.5 Cr (On Track)                       | SIP - Nifty 50     ₹25,000 05 Sep|
| House Downpayment: 45% of ₹40 L                             | Term Insurance     ₹18,500 12 Sep|
+-----------------------------------------------------------------------------------------------+
```

#### Wireframe: Dashboard Mobile

```
+---------------------------------------+
| [=] Paisa Dashboard               [:] |
+---------------------------------------+
| NET WORTH                             |
| ₹84,20,500  ▲ +₹2.2L (+3.2%)          |
+---------------------------------------+
| CASH BALANCE                          |
| ₹2,39,400 (3 accounts)                |
+---------------------------------------+
| EXPENSES                              |
| ₹78,420 · Projected ₹82,000           |
+---------------------------------------+
| BUDGET                                |
| On Track · ₹78k of ₹1.1L planned      |
+---------------------------------------+
| CASH ACCOUNTS                         |
| HDFC Checking                ₹1,42,000 |
| ICICI Savings                  ₹85,400 |
+---------------------------------------+
| [i] INSIGHTS                          |
| Dining +24% vs rolling median         |
+---------------------------------------+
| CASH FLOW                             |
| [=== ECharts Monthly Flow Chart ==========]|
+---------------------------------------+
| SPENDING THIS MONTH                   |
| Total: ₹78,420                        |
| Shopping   ████████████  ₹32k         |
| Groceries  ████████      ₹21k         |
+---------------------------------------+
| NEEDS ATTENTION                       |
| Fuel: ₹5,400 / ₹5,000 (Over by ₹400)  |
+---------------------------------------+
| RECENT ACTIVITY                       |
| Amazon                        -₹1,249 |
| 18 Aug · Shopping                     |
|                                       |
| Salary HDFC                 +₹1,85,000|
| 01 Aug · Income                       |
+---------------------------------------+
| GOALS                                 |
| Retirement: 68% (On Track)            |
+---------------------------------------+
| UPCOMING / RECURRING                  |
| SIP - Nifty 50         ₹25,000 05 Sep |
+---------------------------------------+
```

---

### Archetype B: Analysis

- **Purpose:** Explain *why* a financial metric changed or how it is composed across categories, accounts, and time.
- **Primary Question:** *"Where did my money go?", "How is my net worth compounding?", "What is my tax liability?"*
- **Examples:** `/expense/monthly`, `/expense/yearly`, `/assets/networth`, `/assets/allocation`, `/assets/analysis`, `/cash_flow/monthly`, `/cash_flow/yearly`, `/income`, `/liabilities/balance`, `/liabilities/interest`, `/liabilities/repayment`, `/more/tax/capital_gains`, `/more/tax/harvest`.
- **Desktop Pattern:**
  1. `PageHeader` + Period / Context Selector
  2. `MetricStrip` / key financial context
  3. Primary analysis region: Category / Composition visualization + Calendar / comparison / secondary visualization
  4. Historical trend / timeline chart
  5. Detailed recent records / table
- **Mobile Transformation:** Stacks sections in priority order: Metrics $\rightarrow$ Composition visualization $\rightarrow$ Calendar/secondary visualization $\rightarrow$ Historical timeline $\rightarrow$ Recent records/table.

#### Wireframe: Monthly Expenses Desktop

```
+-----------------------------------------------------------------------------------------------+
| Monthly Expenses             Expense breakdown, calendar activity, and timeline    [July 2026]|
+-----------------------------------------------------------------------------------------------+
| TOTAL EXPENSES: ₹78,420  |  % OF NET INCOME: 38.2%  |  GROSS: ₹2,40,000  |  INVESTED: ₹91,580 |
+-------------------------------------------------------------+---------------------------------+
| CATEGORY BREAKDOWN                                          | EXPENSE CALENDAR                |
| Housing         ██████████████████████████████  ₹30,000     | Mon Tue Wed Thu Fri Sat Sun     |
| Food & Dining   ████████████████████            ₹24,000     |          1   2   3   4   5      |
| Shopping        ██████████████                  ₹18,000     |  6   7   8   9  10  11  12      |
| Utilities       ████                            ₹6,420      | 13  14  15  16  17  18  19      |
+-------------------------------------------------------------+---------------------------------+
| EXPENSE TREND                                                                                 |
| [=========================== ECharts Monthly Expense Timeline ===================================] |
+-----------------------------------------------------------------------------------------------+
| RECENT EXPENSES                                                                               |
| Amazon India                 Liabilities:CreditCard:Freedom       -₹1,249.00      18 Jul 2026 |
| Starbucks                    Assets:Checking:HDFC                   -₹450.00      17 Jul 2026 |
| Shell Fuel                   Liabilities:CreditCard:Freedom       -₹3,400.00      15 Jul 2026 |
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype C: Data Explorer

- **Purpose:** Search, filter, inspect, and bulk-edit large financial record datasets.
- **Primary Question:** *"Which transactions match my criteria, and how can I update them efficiently?"*
- **Examples:** `/ledger/transaction`, `/ledger/posting`, `/ledger/price`, `/more/tax/schedule_al`.
- **Desktop Pattern:**
  1. `PageHeader` (Title + Dataset count)
  2. `DataToolbar` (Search Query input with autocomplete + Filter toggles + Bulk Edit toggle + Download/Export CTA)
  3. Expandable `BulkEditForm` panel
  4. Virtualized, dense data rows or Tabulator table with sticky headers and right-aligned amounts.
- **Mobile Transformation:** Full-width search bar; desktop table columns collapse into structured multi-line financial record cards with right-aligned amount and badge. Bulk edit opens in a slide-over sheet.

#### Wireframe: Transactions Desktop

```
+-----------------------------------------------------------------------------------------------+
| Transactions                 Journal transactions, search, and bulk edits        [420 Records]|
+-----------------------------------------------------------------------------------------------+
| [ Q Search payee, account:Expenses:Food, commodity:INR...            ] [Bulk Edit v] [Export]|
+-----------------------------------------------------------------------------------------------+
| DATE        PAYEE / DESCRIPTION      ACCOUNT POSTINGS                             AMOUNT      |
+-----------------------------------------------------------------------------------------------+
| 18 Aug 2026 Amazon India             Liabilities:CreditCard:Freedom               -₹1,249.00  |
|                                      Expenses:Shopping:Electronics                +₹1,249.00  |
| 17 Aug 2026 Swiggy                   Assets:Checking:HDFC                           -₹480.00  |
|                                      Expenses:Food:Delivery                        +₹480.00  |
| 01 Aug 2026 Employer Corp            Assets:Checking:HDFC                      +₹1,85,000.00  |
|                                      Income:Salary                             -₹1,85,000.00  |
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype D: Detail

- **Purpose:** Provide an exhaustive 360-degree explanation of a single entity, account, goal, or credit card.
- **Primary Question:** *"What is the exact state, balance, limit, and history of this specific financial entity?"*
- **Examples:** `/liabilities/credit_cards/[slug]`, `/assets/gain/[slug]`, `/more/goals/retirement/[slug]`, `/more/goals/savings/[slug]`, `/more/sheets/[slug]`.
- **Desktop Pattern:**
  1. Back/context navigation + Entity identity + Statement/Period selector
  2. Primary operational state: Amount Due, Due Date, Utilization
  3. Statement calculation equation: $Opening + Purchases - Payments/Credits = Amount Due$
  4. Spending / performance trend
  5. Detailed transaction list / related postings
- **Mobile Transformation:** Amount Due and Due Date first, followed by utilization, equation breakdown, trend chart, and transactions stream.

#### Wireframe: Credit Card Detail Desktop

```
+-----------------------------------------------------------------------------------------------+
| < Credit Cards  /  Liabilities:CreditCard:Freedom                         [Statement: Jul 2026]|
+-----------------------------------------------------------------------------------------------+
| AMOUNT DUE: ₹42,500.00  |  DUE DATE: 20 Aug 2026 (Paid 18 Aug)  |  UTILIZATION: 21.2% (Limit ₹2L)|
+-----------------------------------------------------------------------------------------------+
| STATEMENT EQUATION                                                                            |
| Opening Balance: ₹12,400.00  +  Purchases: ₹48,200.00  -  Credits: ₹18,100.00  =  ₹42,500.00  |
+-----------------------------------------------------------------------------------------------+
| SPENDING TREND                                                                                |
| [=============================== ECharts Yearly Spends Chart ====================================] |
+-----------------------------------------------------------------------------------------------+
| TRANSACTIONS IN STATEMENT (18)                                                                |
| Amazon India                 Expenses:Shopping:Electronics                -₹1,249.00   18 Jul |
| Shell Fuel                   Expenses:Transportation:Fuel                 -₹3,400.00   15 Jul |
| Payment Received             Assets:Checking:HDFC                        +₹18,100.00   10 Jul |
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype E: Operational

- **Purpose:** Manage active financial allocations, periodic envelopes, and upcoming schedules requiring user governance.
- **Primary Question:** *"How much money can I safely allocate or spend right now, and what bills are due?"*
- **Examples:** `/expense/budget`, `/cash_flow/recurring`.
- **Desktop Pattern:**
  1. `PageHeader` + Month Selector
  2. `MetricStrip`: Available to Budget, Available to Spend, Projected Balance
  3. Checking Balance as secondary context
  4. Needs Attention: compact progress rows for overspent/tight envelopes
  5. All Budgets: dense comparison of Category, Budgeted, Spent, Remaining, and Progress. This may be presented as a dense data table or a dense structured list of records (such as `BudgetCard`), provided high information density and scanability are maintained without oversized decorative card containers.
- **Mobile Transformation:** Metrics $\rightarrow$ checking balance $\rightarrow$ needs attention $\rightarrow$ compact budget records.

#### Wireframe: Budget Desktop

```
+-----------------------------------------------------------------------------------------------+
| Budget                       Monthly envelope budgeting and spending tracking     [July 2026] |
+-----------------------------------------------------------------------------------------------+
| AVAILABLE TO BUDGET: ₹45,000 | AVAILABLE TO SPEND: ₹62,400 / ₹1.1L | PROJECTED BALANCE: ₹1.82L|
+-----------------------------------------------------------------------------------------------+
| Checking Balance Context: HDFC Checking ₹1,42,000  ·  ICICI Savings ₹85,400                   |
+-----------------------------------------------------------------------------------------------+
| NEEDS ATTENTION                                                                               |
| Shopping: Spent ₹28,900 / Budget ₹20,000  [████████████████████████]  Overspent by ₹8,900     |
+-----------------------------------------------------------------------------------------------+
| ALL BUDGETS (Dense Comparison: Table or Structured Record List)                               |
| Food & Dining     Budgeted: ₹25,000.00  Spent: ₹18,400.00  Remaining: ₹6,600.00  [████████░]  |
| Utilities         Budgeted: ₹10,000.00  Spent:  ₹4,200.00  Remaining: ₹5,800.00  [████░░░░]  |
| Transportation    Budgeted:  ₹8,000.00  Spent:  ₹6,100.00  Remaining: ₹1,900.00  [███████░]  |
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype F: Configuration

- **Purpose:** Modify system, currency, journal, commodity, and rule parameters cleanly.
- **Desktop Pattern:**
  - `PageHeader` with title, description, and unsaved changes badge.
  - Horizontal boxed section tabs selector (`Tabs variant="boxed"`) listing sections: General, Budget, Goals, Prediction, Accounts, Allocation Targets, Commodities, Credit Cards, Import Templates, Schedule AL, User Accounts.
  - Active Section Surface: Section Title Bar (icon, name, count badge, description) + Dynamic JSON Schema form fields / custom list editors.
  - Sticky Footer Bar: Reset to Defaults, Discard Changes, and Save Changes actions.
- **Mobile Transformation:** Horizontal scrollable section tabs; form fields stack vertically; save bar remains sticky at viewport bottom.

#### Wireframe: Configuration Desktop

```
+-----------------------------------------------------------------------------------------------+
| Configuration       Edit paisa.yaml settings by section                 [● Unsaved Changes]   |
+-----------------------------------------------------------------------------------------------+
| [ General ] [ Budget ] [ Goals ] [ Prediction ] [ Accounts ] [ Commodities ] [ Credit Cards ] |
+-----------------------------------------------------------------------------------------------+
| [*] GENERAL CONFIGURATION                                                                     |
| Core workspace settings and default journal paths                                             |
+-----------------------------------------------------------------------------------------------+
| Journal Path                                                                                  |
| [ /home/user/finances/main.ledger                                                           ] |
|                                                                                               |
| Default Currency                                     Locale                                   |
| [ INR                              ]                 [ en-IN                                ] |
|                                                                                               |
| [x] Obscure amounts by default                                                                |
+-----------------------------------------------------------------------------------------------+
| [Reset to Defaults]                                      [Discard Changes]     [Save Changes] |
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype G: Workflow

- **Purpose:** Multi-stage, high-focus activity guiding the user from raw input to verified financial output.
- **Primary Example:** `/ledger/import`.
- **Desktop Pattern:**
  - Header: File status, Template selector, Replace source, progressively disclosed template/advanced actions (`Reverse`, `Trim`).
  - Prediction summary counters: High, Medium, Review, Unknown, Possible Transfer.
  - Workspace: Approximately 35% Source Data / 65% Ledger Preview by default (conceptually resizable). Ledger Preview is the dominant region.
  - Source pane supports: `[ Review ]` (filtered prediction cards) and `[ Raw Data ]` (original statement columns for diagnosing format changes).
  - Selected-row inspector supports: Choose another account, Apply to similar, Always use merchant mapping, Confirm & next review.
  - Persistent final action: Save to Ledger file / Copy.
- **Mobile Transformation:** `[ Source ]` `[ Preview ]` tabs; within Source: `[ Review ]` `[ Raw Data ]`; selected-row review opens in bottom sheet.

#### Wireframe: Ledger Import Desktop

```
+-----------------------------------------------------------------------------------------------+
| File: stmt_jul.csv (58 rows) | Template: [ HDFC Statement v ] [Edit] [...] | [Options: Rev/Trim]|
+-----------------------------------------------------------------------------------------------+
| PREDICTION STATUS: [High: 42] [Medium: 8] [Review: 4] [Unknown: 4] [Transfers: 0]             |
+---------------------------------------------+-------------------------------------------------+
| SOURCE DATA [ Review | Raw Data ]           | LEDGER PREVIEW (CodeMirror)                     |
| 1. Amazon India               -₹1,249 [High]| 2026/07/18 Amazon India                         |
|    Liabilities:CreditCard:HDFC              |   Liabilities:CreditCard:HDFC     -INR 1249.00  |
| 2*.Swiggy Bangalore             -₹480 [Med] |   Expenses:Shopping:Electronics    INR 1249.00  |
|    Expenses:Food:Delivery (0.82)            |                                                 |
| 3. Salary Credited        +₹1,85,000 [High] | 2026/07/17 Swiggy Bangalore                     |
+---------------------------------------------+   Assets:Checking:HDFC              -INR 480.00  |
| SELECTED ROW REVIEW (Row 2)                 |   Expenses:Food:Delivery            INR 480.00  |
| [Choose Account...]  [Apply Similar]        |                                                 |
| [Always Use Merchant]  [Confirm & Next]     |                                                 |
+---------------------------------------------+-------------------------------------------------+
| Status: 58 generated, 0 errors                                          [Copy] [Save to Ledger]|
+-----------------------------------------------------------------------------------------------+
```

---

### Archetype H: Tool

- **Purpose:** Specialized workspace with dedicated interactive mechanics and custom tool panels.
- **Examples:** `/ledger/editor`, `/ledger/editor/[slug]`, `/more/sheets`, `/more/sheets/[slug]`, `/more/doctor`, `/more/logs`, `/login`, `/more/about`.
- **Desktop Pattern (Ledger Editor):**
  - Workspace Toolbar: `main.ledger    ● Unsaved    Valid                         Save    …`
  - Secondary actions progressively disclosed in `…`: Format/Prettify (`Ctrl+I`), Version History, Backup management.
  - New File available directly from the Files pane.
  - 3-Pane Body: Files (220–240px) \| Editor (flexible 1fr) \| Balance / Output (280–340px). Output represents live Paisa balance/validation functionality (not a CLI terminal).
- **Mobile Transformation:** CodeMirror editor consumes 100% viewport. Files, Balance/Output, and Search become accessible via drawer/tool panels.

#### Wireframe: Ledger Editor Desktop

```
+-----------------------------------------------------------------------------------------------+
| [|||] main.ledger    ● Unsaved    Valid                                           [Save]  [...] |
+-------------------+---------------------------------------------+-----------------------------+
| FILES (6)     [+] | main.ledger                                 | LEDGER BALANCE              |
| accounts.ledger   | 2026/08/18 Amazon India                     | Assets:Checking    ₹1,42,000|
| budget.ledger     |     Liabilities:CreditCard:Freedom  -₹1,249 | Liabilities:Card    -₹42,500|
| * main.ledger     |     Expenses:Shopping:Electronics    ₹1,249 | Expenses:Food        ₹24,000|
| prices.ledger     |                                             | ----------------------------|
|                   | 2026/08/17 Swiggy                           | Total:             ₹1,23,500|
|                   |     Assets:Checking:HDFC              -₹480 |                             |
|                   |     Expenses:Food:Delivery             ₹480 |                             |
+-------------------+---------------------------------------------+-----------------------------+
```

---

## 11. Data Region State Model & Interaction Guarantees

Every data region, table, chart frame, and section in Paisa must explicitly handle the six canonical data states without breaking layout geometry.

```
       ┌───────────┐
       │  LOADING  │ ──(API Fetch)──┐
       └─────┬─────┘                │
             │                      ▼
             │               ┌─────────────┐
             ├──────────────►│    ERROR    │
             │               └─────────────┘
             ▼                      ▲
       ┌───────────┐                │
       │  LOADED   │ ──(Failure)────┤
       └─────┬─────┘                │
             ├──────────────┬───────┴─────┐
             ▼              ▼             ▼
       ┌───────────┐  ┌───────────┐ ┌───────────┐
       │   EMPTY   │  │  PARTIAL  │ │   STALE   │
       └───────────┘  └───────────┘ └───────────┘
```

### 11.1 The Six Data States

1. **`loading`:** Render geometry-preserving skeletons. Skeletons must match final geometry; layout collapse is forbidden.
2. **`loaded`:** Full data presentation with complete interaction support.
3. **`empty`:** Informative zero-state with an explicit explanation of *why* it is empty and a clear call to action or status feedback. Compliance is semantic: use shared `<ZeroState />` when a page-level actionable onboarding or empty status is appropriate; use local `<ChartFrame empty={...}>`, Tabulator empty alerts, or search-specific empty states when localized component handling is contextually superior.
4. **`partial`:** Gracefully display available portions while rendering subtle warnings for missing slices.
5. **`error`:** Section-localized error message with retry CTA.
6. **`stale`:** Visible when a background sync or price update is running.

---

## 12. Component Architecture & Layering

Paisa enforces a strict 5-area ownership model (see `$lib/README.md` for the full dependency enforcement rules):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SvelteKit Routes (frontend/src/routes/(app)/...)         │
│    Page URLs, loading orchestration, composition            │
├─────────────────────────────────────────────────────────────┤
│ 2. Feature Modules ($lib/features/<feature>/)               │
│    Business-specific UI, data transforms, chart data        │
│    e.g. features/expense/, features/prediction/,            │
│         features/importing/, features/insights/             │
├─────────────────────────────────────────────────────────────┤
│ 3. Shared Presentation ($lib/shared/)                       │
│    ├── layout/: AppShell, Page, PageHeader, MetricStrip,    │
│    │   Section, CommandPalette, ResponsiveGrid, Stack       │
│    ├── ui/: Button, Input, Select, Dialog, Drawer, Badge,   │
│    │   Table, Tabs, Card, ChartFrame, ZeroState, Tooltip    │
│    ├── charts/: EChartSurface, TimeSeriesChart,             │
│    │   ComparisonBarChart, FinancialHierarchyChart           │
│    ├── editor/: CodeMirror foundations                      │
│    ├── styles/: foundation.css, legacy-compat.css           │
│    └── theme/: tokens.css, chartPalette.ts, color.ts        │
├─────────────────────────────────────────────────────────────┤
│ 4. Domain ($lib/domain/)                                    │
│    Framework-independent financial concepts & calculations   │
│    (postings, accounts, assets, cash flow, goals, tax, etc.)│
├─────────────────────────────────────────────────────────────┤
│ 5. API ($lib/api/)                                          │
│    Backend transport, generated DTOs, auth, error handling   │
├─────────────────────────────────────────────────────────────┤
│ 6. Foundation: Tailwind CSS v4 / Bits UI / ECharts / Native │
└─────────────────────────────────────────────────────────────┘
```

### 12.1 Dependency Rules

- **Domain** cannot depend on Svelte, routes, features, UI, or API transport.
- **Shared** cannot depend on features or routes.
- **Features** and **generated** output cannot depend on routes.
- **API** cannot depend on routes or feature implementations.
- Enforced by `deno task architecture` boundary checks.

---

## 13. Data Display, Tables, Forms, and Chart Rules

### 13.1 Table and Grid Rules

1. **Numeric Column Alignment:** All currency amounts, quantities, unit prices, and percentages **must be right-aligned** in both header and cells.
2. **Tabular Figures:** Always apply `font-variant-numeric: tabular-nums`.
3. **No Splitting of Amounts:** Currency symbols and values must never wrap across lines.
4. **Header Sticky Behavior:** Table headers remain sticky during vertical scrolling.
5. **Mobile Transformation:** Tables collapse into compact record cards on viewports $< 768\text{px}$.

### 13.2 Form Rules

1. **Structural Hierarchy:** `Page` $\rightarrow$ `Section` $\rightarrow$ `FormField`.
2. **Unified Field API:** Every form control supports `label`, `description`, `error`, `warning`, `required`, `disabled`, and `readonly`.
3. **Progressive Disclosure:** Advanced or destructive settings are grouped in collapsible sections.
4. **Anti-Pattern:** Never enclose individual form fields in standalone cards.

### 13.3 Chart Rules (ECharts 6)

1. **Container Management:** Every chart is rendered inside `<EChartSurface />` (`$lib/shared/charts/EChartSurface.svelte`), which manages lifecycle (lazy ECharts core import, `ResizeObserver` binding, instance disposal on unmount).
2. **Higher-Level Wrappers:** Use `<TimeSeriesChart />`, `<ComparisonBarChart />`, or `<FinancialHierarchyChart />` for standard chart patterns. These accept typed data contracts and delegate to `<EChartSurface />`.
3. **Theme Integration:** Chart themes are read from `$lib/shared/charts/echarts/theme.ts` which derives colors from semantic CSS variables at render time.
4. **Color Palette:** Use semantic colors from `$lib/shared/theme/chartPalette.ts`.
5. **Responsive Behavior:** Charts auto-resize via `ResizeObserver`. Option builders in `$lib/shared/charts/echarts/responsive.ts` produce viewport-aware configurations.
6. **Tooltips:** Tooltips use the Paisa chart tooltip formatter (`$lib/shared/charts/tooltip.ts`) with semantic styling.

---

## 14. Responsive & Overflow Rules

### 14.1 Key Responsive Transformations

| Element / Layout | Desktop ($\ge 1024\text{px}$) | Mobile ($< 768\text{px}$) |
| :--- | :--- | :--- |
| **Global Navigation** | Fixed collapsible sidebar | Slide-over drawer toggled via burger menu |
| **Analysis Views** | Multi-chart row + timeline | Ordered vertical stack |
| **Multi-Column Tables** | Virtualized dense table | Compact multi-line record cards |
| **Ledger Import** | 35% Source / 65% Preview split | `[Source]` / `[Preview]` tabs + bottom sheet inspector |
| **Ledger Editor** | 3-Pane workspace (Files \| Editor \| Balance) | Fullscreen Editor with drawer panel toggles |
| **Configuration** | Sticky left navigation rail + main panel | Top horizontal section selector + vertical form stack |
| **Metric Strip** | Horizontal 4-column strip | 2-column or single-column stack |

### 14.2 Overflow Acceptance Checklist

The following sensitive routes must pass automated overflow tests without horizontal document scrollbar triggers:
`/ledger/posting`, `/ledger/price`, `/ledger/transaction`, `/expense/monthly`, `/expense/yearly`, `/assets/allocation`, `/assets/analysis`, `/more/config`, `/more/sheets/[slug]`, `/cash_flow/recurring`.

---

## 15. Accessibility & Motion Standards

- **Keyboard Navigation:** All interactive elements focusable via `Tab` / `Shift+Tab`.
- **Visible Focus Ring:** 2px offset brand ring (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`).
- **Color Independence:** Financial status must include textual labels, icons, or badges.
- **Screen Reader Labels:** All icon-only buttons declare explicit `aria-label` or `title`.
- **Motion Standards:** Transitions 150–200ms; disable all transitions when `prefers-reduced-motion: reduce` is active.

---

## 16. Development UI Design Lab (`/dev/ui`)

A dedicated development route at `/dev/ui` provides an interactive component showcase and design lab.

- Matrix toggles: Light mode / Dark mode / Desktop width (1440px) / Mobile width (390px).
- State previews: Normal, Hover, Focus, Disabled, Loading, Skeleton, Empty, Error, Unsaved Dirty.
- Financial test fixtures: `₹0.00`, `₹1,249.00`, `₹82,40,500.00`, `-₹1,249.00`, long account strings, diverse commodities.

---

## 17. Complete 41-Route Inventory & Canonical Design Contracts

The table and 41 individual route design contracts below represent the binding UI/UX specifications for the entire Paisa frontend.

### 17.1 Complete Route Inventory Table

| # | Route Path | Page Title | Primary Archetype | Primary Question Answered |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `/` | Dashboard | Overview | What is my current financial position at a glance? |
| **2** | `/assets/allocation` | Asset Allocation | Analysis | How are investments distributed across classes vs targets? |
| **3** | `/assets/analysis` | Asset Analysis | Analysis | What is the detailed security-level performance and exposure? |
| **4** | `/assets/balance` | Asset Balance | Analysis | What are the exact current balances of all asset accounts? |
| **5** | `/assets/gain` | Asset Gain | Analysis | What are my realized and unrealized gains across assets? |
| **6** | `/assets/gain/[slug]` | Asset Gain Detail | Detail | What is the lot-by-lot gain and performance for this asset? |
| **7** | `/assets/investment` | Investment | Analysis | How much capital have I invested vs valuation over time? |
| **8** | `/assets/networth` | Net Worth | Analysis | How is my total net worth trending over time? |
| **9** | `/cash_flow/income_statement` | Income Statement | Analysis | What is the yearly P&L statement of income vs expenses? |
| **10** | `/cash_flow/monthly` | Monthly Cash Flow | Analysis | What was my net cash surplus or deficit in each month? |
| **11** | `/cash_flow/recurring` | Recurring Transactions | Operational | What scheduled recurring bills and subscriptions are coming up? |
| **12** | `/cash_flow/yearly` | Yearly Cash Flow | Analysis | How does multi-year cash flow compare at different depths? |
| **13** | `/expense/budget` | Budget | Operational | How much spending budget remains in each category this month? |
| **14** | `/expense/monthly` | Monthly Expenses | Analysis | Where did my money go this month across categories and days? |
| **15** | `/expense/yearly` | Yearly Expenses | Analysis | How has annual spending evolved across categories over time? |
| **16** | `/income` | Income | Analysis | What are my income streams and how do they trend over time? |
| **17** | `/ledger/editor` | Ledger Editor | Tool | What is the active ledger file and balance validation status? |
| **18** | `/ledger/editor/[slug]` | Ledger Editor File | Tool | How do I edit, format, and save this specific ledger file? |
| **19** | `/ledger/import` | Ledger Import | Workflow | How do I convert a statement into validated journal entries? |
| **20** | `/ledger/posting` | Postings | Data Explorer | What individual posting entries exist across all accounts? |
| **21** | `/ledger/price` | Prices | Data Explorer | What historical commodity and exchange rate quotes exist? |
| **22** | `/ledger/transaction` | Transactions | Data Explorer | What transactions match my query, and how do I bulk edit them? |
| **23** | `/liabilities/balance` | Liabilities Balance | Analysis | What are my outstanding balances across loans and credit lines? |
| **24** | `/liabilities/credit_cards` | Credit Cards | Overview | What is the utilization, bill status, and balance of all cards? |
| **25** | `/liabilities/credit_cards/[slug]` | Credit Card Detail | Detail | What is the bill history and transaction breakdown for this card? |
| **26** | `/liabilities/interest` | Interest Analysis | Analysis | How much interest am I paying across borrowing facilities? |
| **27** | `/liabilities/repayment` | Loan Repayment | Analysis | What is the principal vs interest repayment progress on debts? |
| **28** | `/more/about` | About | Tool | What version of Paisa is running and where are resources? |
| **29** | `/more/config` | Configuration | Configuration | How do I configure paisa.yaml settings and prediction rules? |
| **30** | `/more/doctor` | Doctor | Tool | Are there any journal syntax, account, or config diagnostics? |
| **31** | `/more/goals` | Goals | Overview | How am I progressing toward retirement and savings targets? |
| **32** | `/more/goals/retirement/[slug]` | Retirement Goal Detail | Detail | What is the savings runway and corpus projection for retirement? |
| **33** | `/more/goals/savings/[slug]` | Savings Goal Detail | Detail | What is the progress, timeline, and deposit history for this goal? |
| **34** | `/more/logs` | Logs | Tool | What structured server and application logs were recorded? |
| **35** | `/more/sheets` | Sheets | Tool | What custom calculation sheets exist in the workspace? |
| **36** | `/more/sheets/[slug]` | Sheet Detail | Detail / Tool | How do I edit and evaluate this specific `.paisa` sheet? |
| **37** | `/more/tax/capital_gains` | Capital Gains Tax | Analysis | What is my short-term vs long-term capital gains tax liability? |
| **38** | `/more/tax/harvest` | Tax Harvesting | Analysis | Which investment lots can be harvested for tax optimization? |
| **39** | `/more/tax/schedule_al` | Schedule AL | Data Explorer | What is the formal Asset and Liability statement for tax filing? |
| **40** | `/insights` | Insights | Analysis | What changed in my finances this month and why? |
| **41** | `/login` | Login | Tool | How do I authenticate to access the Paisa workspace? |

---

### 17.2 Detailed Canonical Contracts for All 41 Routes

#### 1. `/` — Dashboard

- **Page Name:** Dashboard
- **Primary Archetype:** Overview
- **Primary Question:** What is my current financial position at a glance?
- **Page Header:** Breadcrumb: Home; Title: "Dashboard"; Subtoolbar: Obscure toggle, Sync action.
- **Primary Information:** MetricStrip (Net Worth, Cash Balance, Expenses, Budget), Cash Accounts summary, Insights Gateway.
- **Secondary Information:** Cash Flow timeline chart, Current month expense breakdown comparison, Budget health / Needs attention alerts, Recent activity postings list, Goals summary, Upcoming recurring items.
- **Primary Actions:** Sync journal, Setup demo (in empty state).
- **Desktop Composition:** MetricStrip $\rightarrow$ Cash Accounts strip $\rightarrow$ Insights Gateway banner $\rightarrow$ Cash Flow | Spending row $\rightarrow$ Needs Attention / Budget Health | Recent Activity row $\rightarrow$ Goals | Upcoming recurring row.
- **Mobile Transformation:** Strict single column stack: Net Worth $\rightarrow$ Secondary metrics $\rightarrow$ Cash Accounts $\rightarrow$ Insights Gateway $\rightarrow$ Cash Flow $\rightarrow$ Spending $\rightarrow$ Needs Attention $\rightarrow$ Recent Activity $\rightarrow$ Goals $\rightarrow$ Upcoming.
- **Loading Behavior:** Geometry-preserving skeletons for metric strip and both chart frames.
- **Empty Behavior:** Full-page `<ZeroState />` offering "Get Started" guide or "Setup Demo" button (`/api/init`).
- **Error Behavior:** Section-localized alerts for failing API segments; remaining sections stay visible.
- **Preserved Functionality:** Interactive ECharts cash flow chart with legends, ECharts month breakdown comparison, Last N Months selector, Insights integration, direct drill-down links to all sections.

#### 2. `/assets/allocation` — Asset Allocation

- **Page Name:** Asset Allocation
- **Primary Archetype:** Analysis
- **Primary Question:** How are my investments distributed across asset classes vs target allocations?
- **Page Header:** Title: "Asset Allocation", Description: "Asset class distribution, targets, and historical allocation".
- **Primary Information:** Allocation targets treemap, Allocation by category, Allocation by value.
- **Secondary Information:** Allocation timeline chart with legends, Tabular allocation leaf nodes table.
- **Primary Actions:** Category depth toggle, target adjustment link.
- **Desktop Composition:** Target treemap (if targets configured) $\rightarrow$ Allocation by category $\rightarrow$ Allocation by value $\rightarrow$ Allocation timeline with legends $\rightarrow$ Allocation data table.
- **Mobile Transformation:** Stacked sequence of charts followed by responsive allocation table with progress bar column.
- **Loading Behavior:** ECharts chart skeletons preserving depth-dependent heights.
- **Empty Behavior:** EmptyState with guidance to configure allocation targets in settings.
- **Error Behavior:** Local error message in chart frame with retry CTA.
- **Preserved Functionality:** ECharts treemap, dynamic depth scaling (`depth * 100px`), ECharts timeline resize, Tabulator progress bar column.

#### 3. `/assets/analysis` — Asset Analysis

- **Page Name:** Asset Analysis
- **Primary Archetype:** Analysis
- **Primary Question:** What is the detailed security-level performance and exposure across portfolios?
- **Page Header:** Title: "Asset Analysis", Description: "Portfolio breakdown, security performance, and asset metrics".
- **Primary Information:** Portfolio security type breakdown chart, Market valuation by security.
- **Secondary Information:** Individual asset exposure shares, XIRR by holding.
- **Primary Actions:** View filter toggle.
- **Desktop Composition:** Security type composition chart $\rightarrow$ Asset exposure distribution $\rightarrow$ Detailed security table.
- **Mobile Transformation:** Stacked charts followed by compact asset record cards.
- **Loading Behavior:** Skeleton loaders matching chart dimensions.
- **Empty Behavior:** ZeroState indicating no investment assets found in journal.
- **Error Behavior:** Localized failure banner.
- **Preserved Functionality:** ECharts portfolio security visualization, alpha-tag indicators.

#### 4. `/assets/balance` — Asset Balance

- **Page Name:** Asset Balance
- **Primary Archetype:** Analysis
- **Primary Question:** What are the exact current balances of all asset accounts?
- **Page Header:** Title: "Asset Balance", Description: "Hierarchical balance tree across all asset accounts".
- **Primary Information:** Asset account tree with market valuation, cost, and balance.
- **Secondary Information:** Commodity quantities and currency breakdowns.
- **Primary Actions:** Expand/Collapse tree nodes, search account.
- **Desktop Composition:** Account balance hierarchy tree/table with right-aligned currency amounts.
- **Mobile Transformation:** Indented hierarchical balance list with collapsible account nodes.
- **Loading Behavior:** Skeleton tree rows with pulsating placeholders.
- **Empty Behavior:** ZeroState with link to add asset accounts in editor.
- **Error Behavior:** Local alert banner.
- **Preserved Functionality:** Account tree hierarchy parsing, multi-commodity formatting.

#### 5. `/assets/gain` — Asset Gain

- **Page Name:** Asset Gain
- **Primary Archetype:** Analysis
- **Primary Question:** What are my realized and unrealized capital gains across assets?
- **Page Header:** Title: "Asset Gain", Description: "Realized and unrealized gains across investment holdings".
- **Primary Information:** Gain overview category chart with legends, Gain timeline breakdown.
- **Secondary Information:** Per-account gain details and historic performance.
- **Primary Actions:** Period toggle.
- **Desktop Composition:** Gain overview chart with legend card $\rightarrow$ Per-account gain timeline breakdown.
- **Mobile Transformation:** Stacked overview chart followed by per-account gain cards.
- **Loading Behavior:** ECharts chart skeletons.
- **Empty Behavior:** ZeroState indicating no investment gains recorded.
- **Error Behavior:** Localized chart error display.
- **Preserved Functionality:** ECharts gain breakdown chart, interactive legends, account drill-down to `/assets/gain/[slug]`.

#### 6. `/assets/gain/[slug]` — Asset Gain Detail

- **Page Name:** Asset Gain Detail
- **Primary Archetype:** Detail
- **Primary Question:** What is the lot-by-lot gain and performance for this specific asset?
- **Page Header:** Title: Asset account name (e.g. `Assets:Equity:HDFC`); Breadcrumb navigation back to `/assets/gain`.
- **Primary Information:** Current valuation, Total gain/loss, XIRR, Net invested capital.
- **Secondary Information:** Buy/sell transaction history, lot-wise cost basis.
- **Primary Actions:** Back to Gain Overview.
- **Desktop Composition:** Top KPI strip $\rightarrow$ Asset performance chart $\rightarrow$ Lot transaction history table.
- **Mobile Transformation:** KPIs first $\rightarrow$ performance chart $\rightarrow$ transaction records.
- **Loading Behavior:** Skeleton KPI strip and table rows.
- **Empty Behavior:** Message indicating no transactions found for this asset.
- **Error Behavior:** Local error banner with back button.
- **Preserved Functionality:** URL slug decoding (`decodeURIComponent`), lot-by-lot XIRR computation.

#### 7. `/assets/investment` — Investment

- **Page Name:** Investment
- **Primary Archetype:** Analysis
- **Primary Question:** How much capital have I invested vs valuation over time?
- **Page Header:** Title: "Investment", Description: "Monthly and yearly investment timeline & breakdowns".
- **Primary Information:** Monthly investment timeline chart with legends, Financial year investment timeline.
- **Secondary Information:** Annual investment breakdown cards grid.
- **Primary Actions:** Financial year selector.
- **Desktop Composition:** Monthly investment timeline $\rightarrow$ Financial year investment timeline $\rightarrow$ Responsive grid of `InvestmentYearlyCard` components.
- **Mobile Transformation:** Stacked timeline charts followed by single-column annual cards.
- **Loading Behavior:** ECharts timeline skeletons.
- **Empty Behavior:** ZeroState indicating no investment postings in journal.
- **Error Behavior:** Local chart error with retry CTA.
- **Preserved Functionality:** ECharts monthly & yearly investment charts, `InvestmentYearlyCard` metric rendering.

#### 8. `/assets/networth` — Net Worth

- **Page Name:** Net Worth
- **Primary Archetype:** Analysis
- **Primary Question:** How is my total net worth trending over time across currencies?
- **Page Header:** Title: "Net Worth", Description: "Track assets and investment growth over time"; Subtoolbar: Date range selector.
- **Primary Information:** MetricStrip (Net worth, Net Investment, Gain/Loss, XIRR).
- **Secondary Information:** ECharts net worth timeline chart with asset/liability area fills and legends.
- **Primary Actions:** Date range picker.
- **Desktop Composition:** MetricStrip (4 cols) $\rightarrow$ Full-width ECharts timeline chart with legend card.
- **Mobile Transformation:** MetricStrip (2 cols or stack) $\rightarrow$ Scaled net worth timeline chart.
- **Loading Behavior:** Skeleton metric strip and chart frame placeholder.
- **Empty Behavior:** ZeroState for periods with no net worth activity.
- **Error Behavior:** Localized error box.
- **Preserved Functionality:** Date range filtering via `$dateRange`, ECharts networth timeline with resize observer.

#### 9. `/cash_flow/income_statement` — Income Statement

- **Page Name:** Income Statement
- **Primary Archetype:** Analysis
- **Primary Question:** What is the formal P&L statement of income vs expenses for the year?
- **Page Header:** Title: "Income Statement", Description: "Yearly profit and loss statement across all accounts"; Subtoolbar: Financial year picker.
- **Primary Information:** MetricStrip (Selected Year, Starting Net Worth, Ending Net Worth, Net Change).
- **Secondary Information:** Cash flow Sankey/flow overview chart, Multi-year detailed statement table.
- **Primary Actions:** Financial year selector.
- **Desktop Composition:** MetricStrip $\rightarrow$ Cash flow overview chart $\rightarrow$ Detailed statement table with sticky headers and summary footers.
- **Mobile Transformation:** MetricStrip $\rightarrow$ Flow chart $\rightarrow$ Horizontally scrollable statement table.
- **Loading Behavior:** Metric skeletons and table skeleton rows.
- **Empty Behavior:** ZeroState indicating no transactions for the selected year.
- **Error Behavior:** Local error notification.
- **Preserved Functionality:** Account grouping logic (Income, Tax, Interest, PnL, Equity, Liabilities, Expenses), multi-year column comparison, sticky headers.

#### 10. `/cash_flow/monthly` — Monthly Cash Flow

- **Page Name:** Monthly Cash Flow
- **Primary Archetype:** Analysis
- **Primary Question:** What was my net cash surplus or deficit in each month?
- **Page Header:** Title: "Cash Flow", Description: "Monthly cash movement and checking balance"; Subtoolbar: Date range selector.
- **Primary Information:** Monthly cash flow chart (Income vs Expenses vs Investment vs Tax).
- **Secondary Information:** Interactive legends, checking balance line.
- **Primary Actions:** Date range selector.
- **Desktop Composition:** Legend card $\rightarrow$ Full-width ECharts monthly cash flow chart.
- **Mobile Transformation:** Legend card $\rightarrow$ Responsive monthly cash flow chart.
- **Loading Behavior:** ECharts chart skeleton.
- **Empty Behavior:** EmptyState with message "No cash-flow activity in this period".
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** ECharts vertical/horizontal rotation option, balance line overlay, `$dateRange` reactivity.

#### 11. `/cash_flow/recurring` — Recurring Transactions

- **Page Name:** Recurring Transactions
- **Primary Archetype:** Operational
- **Primary Question:** What scheduled recurring bills and subscriptions are coming up?
- **Page Header:** Title: "Recurring Transactions", Description: "Track scheduled payments, bills, and subscriptions"; Subtoolbar: Month picker, Recurring status legend icons.
- **Primary Information:** Calendar grid with recurring transaction markers.
- **Secondary Information:** List of `RecurringCard` items showing next unpaid schedule and status.
- **Primary Actions:** Month selector, Schedule details.
- **Desktop Composition:** 7-column weekday calendar grid $\rightarrow$ List of recurring transaction cards.
- **Mobile Transformation:** Collapsed calendar view $\rightarrow$ Stack of `RecurringCard` items.
- **Loading Behavior:** Calendar skeleton grid and card placeholders.
- **Empty Behavior:** ZeroState with documentation link to configure recurring transactions in `paisa.yaml`.
- **Error Behavior:** Local alert banner.
- **Preserved Functionality:** `RecurringSchedule` computation, cleared/late/past-due/upcoming status badges, month-based navigation.

#### 12. `/cash_flow/yearly` — Yearly Cash Flow

- **Page Name:** Yearly Cash Flow
- **Primary Archetype:** Analysis
- **Primary Question:** How does multi-year cash flow compare at different account depths?
- **Page Header:** Title: "Yearly Cash Flow", Description: "Annual income vs expenses comparison"; Subtoolbar: Financial year picker, Depth slider.
- **Primary Information:** Multi-year cash flow bar chart at selected account depth.
- **Secondary Information:** Account depth distribution breakdown.
- **Primary Actions:** Account depth slider (`$cashflowExpenseDepth`, `$cashflowIncomeDepth`).
- **Desktop Composition:** Controls subtoolbar $\rightarrow$ ECharts yearly cash flow chart $\rightarrow$ Account breakdown list.
- **Mobile Transformation:** Depth controls in popover $\rightarrow$ Responsive yearly cash flow chart $\rightarrow$ Breakdown cards.
- **Loading Behavior:** ECharts chart skeleton.
- **Empty Behavior:** ZeroState indicating no annual cash flow data.
- **Error Behavior:** Local error message.
- **Preserved Functionality:** Max depth filtering, financial year range calculation.

#### 13. `/expense/budget` — Budget

- **Page Name:** Budget
- **Primary Archetype:** Operational
- **Primary Question:** How much spending budget remains in each category this month?
- **Page Header:** Title: "Budget", Description: "Monthly envelope budgeting and spending tracking"; Subtoolbar: Month picker.
- **Primary Information:** MetricStrip (Available to Budget, Available to Spend, Projected Balance).
- **Secondary Information:** Checking Balance context, Needs attention rows, All Budgets dense comparison (Category, Budgeted, Spent, Remaining, Progress).
- **Primary Actions:** Month selector.
- **Desktop Composition:** MetricStrip $\rightarrow$ Checking balance context $\rightarrow$ Needs attention alerts $\rightarrow$ All Budgets dense comparison (table or structured list of dense `BudgetCard` items).
- **Mobile Transformation:** Metrics $\rightarrow$ Checking balance $\rightarrow$ Needs attention $\rightarrow$ Compact budget cards stack.
- **Loading Behavior:** Skeleton metric items and budget row placeholders.
- **Empty Behavior:** ZeroState with link to budget documentation.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Checking balance context, Available to budget vs deficit calculation, spend forecast, rollover tracking.

#### 14. `/expense/monthly` — Monthly Expenses

- **Page Name:** Monthly Expenses
- **Primary Archetype:** Analysis
- **Primary Question:** Where did my money go this month across categories and days?
- **Page Header:** Title: "Monthly Expenses", Description: "Monthly expense breakdown, calendar activity, and timeline"; Subtoolbar: Month picker, Date range selector.
- **Primary Information:** Total Expenses, % of Net Income, Income context.
- **Secondary Information:** Category breakdown chart, Expense calendar heatmap, Expense timeline chart, Recent expenses list.
- **Primary Actions:** Month picker, Date range selector, Category filter.
- **Desktop Composition:** Summary metrics $\rightarrow$ Category breakdown | Expense calendar row $\rightarrow$ Expense timeline chart $\rightarrow$ Recent expenses list.
- **Mobile Transformation:** Stack: Total Expenses $\rightarrow$ Income context $\rightarrow$ Category breakdown $\rightarrow$ Calendar $\rightarrow$ Timeline $\rightarrow$ Recent expenses.
- **Loading Behavior:** Skeleton loaders for metric strip, calendar, and breakdown charts.
- **Empty Behavior:** ZeroState for months without expense postings.
- **Error Behavior:** Local chart error with retry.
- **Preserved Functionality:** ECharts category breakdown, ECharts calendar heatmap, ECharts timeline, category color scales.

#### 15. `/expense/yearly` — Yearly Expenses

- **Page Name:** Yearly Expenses
- **Primary Archetype:** Analysis
- **Primary Question:** How has annual spending evolved across categories over the years?
- **Page Header:** Title: "Yearly Expenses", Description: "Multi-year annual expense trends and category comparisons"; Subtoolbar: Financial year picker.
- **Primary Information:** Yearly expense timeline chart with legends.
- **Secondary Information:** Annual category breakdown tables.
- **Primary Actions:** Financial year picker.
- **Desktop Composition:** Legend card $\rightarrow$ ECharts yearly expense timeline chart $\rightarrow$ Annual category data table.
- **Mobile Transformation:** Legend card $\rightarrow$ Responsive timeline chart $\rightarrow$ Category cards.
- **Loading Behavior:** ECharts chart skeleton.
- **Empty Behavior:** ZeroState for years without expenses.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** ECharts yearly timeline chart, category color mapping.

#### 16. `/income` — Income

- **Page Name:** Income
- **Primary Archetype:** Analysis
- **Primary Question:** What are my income streams and how are they distributed over time?
- **Page Header:** Title: "Income", Description: "Monthly and financial year income, net income, and tax tracking".
- **Primary Information:** MetricStrip (Gross Income, Net Tax).
- **Secondary Information:** Monthly income timeline chart, Financial year income timeline (3-column grid: Gross, Net Income, Net Tax).
- **Primary Actions:** Period toggle.
- **Desktop Composition:** MetricStrip $\rightarrow$ Monthly income timeline $\rightarrow$ 3-column yearly income grid.
- **Mobile Transformation:** MetricStrip $\rightarrow$ Monthly income timeline $\rightarrow$ Stacked yearly income charts.
- **Loading Behavior:** Metric and ECharts chart skeletons.
- **Empty Behavior:** ZeroState indicating no income postings found.
- **Error Behavior:** Local error alert.
- **Preserved Functionality:** Multi-chart ECharts client-width rendering, posting aggregation.

#### 17. `/ledger/editor` — Ledger Editor (Root)

- **Page Name:** Ledger Editor
- **Primary Archetype:** Tool
- **Primary Question:** What is the active ledger file and balance validation status?
- **Page Header:** Workspace toolbar: Active filename, Unsaved badge, Save button, More actions (`...`).
- **Primary Information:** CodeMirror 6 editor loaded with default journal file (`main.ledger`).
- **Secondary Information:** FileTree sidebar, Live `hledger balance` output panel.
- **Primary Actions:** Save (`Ctrl+S`), Prettify (`Ctrl+I`), New file, Version history revert, Sidebar toggle, Output toggle.
- **Desktop Composition:** 3-Pane layout: Files sidebar (220–240px) \| Editor (1fr) \| Balance output (280–340px).
- **Mobile Transformation:** Fullscreen CodeMirror editor with drawer toggles for Files and Output.
- **Loading Behavior:** Editor skeleton frame.
- **Empty Behavior:** Automatic redirect or creation prompt for `main.ledger`.
- **Error Behavior:** Real-time error badge with click-to-jump line navigation.
- **Preserved Functionality:** Auto-redirect to first available file, dirty state tracking, `hledger` validation.

#### 18. `/ledger/editor/[slug]` — Ledger Editor File

- **Page Name:** Ledger Editor File
- **Primary Archetype:** Tool
- **Primary Question:** How do I edit, format, and save this specific ledger file?
- **Page Header:** Workspace toolbar: Selected filename, Unsaved dot, Diagnostic status, Save CTA, More actions (`...`).
- **Primary Information:** CodeMirror 6 editor displaying the target file's content with autocompletions.
- **Secondary Information:** FileTree sidebar, Backup version history, Balance report panel.
- **Primary Actions:** Save (`Ctrl+S`), Prettify (`Ctrl+I`), Undo/Redo, Revert backup, Delete backups, New file modal.
- **Desktop Composition:** 3-Pane layout: Files sidebar (220–240px) \| Editor (1fr) \| Balance output (280–340px).
- **Mobile Transformation:** Fullscreen editor with drawer panels for Files, Output, and Version History.
- **Loading Behavior:** Editor placeholder with line numbers.
- **Empty Behavior:** File not found alert with return to Editor root.
- **Error Behavior:** Diagnostics badge showing error count; click jumps to exact error line.
- **Preserved Functionality:** `beforeNavigate` unsaved change dialog, URL line-hash jumping (`#42`), backup snapshotting, autocompletions for accounts/commodities/payees.

#### 19. `/ledger/import` — Ledger Import

- **Page Name:** Ledger Import
- **Primary Archetype:** Workflow
- **Primary Question:** How do I convert bank/broker statements into validated journal transactions?
- **Page Header:** Topbar: Active file, Template selector, Replace file, Edit template, Create template, Save template, Delete template, Reverse/Trim switches.
- **Primary Information:** Source tabular spreadsheet data with column tags (`ROW.A`), Prediction badges, CodeMirror Ledger Preview.
- **Secondary Information:** Prediction review filter bar (High, Med, Review, Unknown, Transfers), Prediction detail inspector.
- **Primary Actions:** Drop file, Select template, Override prediction, Apply to similar, Always use merchant, Save to ledger file, Copy.
- **Desktop Composition:** Topbar $\rightarrow$ Split workspace (~35% Source with Review/Raw Data \| ~65% Ledger Preview) $\rightarrow$ Slide-over template drawer on request $\rightarrow$ Bottom status bar.
- **Mobile Transformation:** Tabs: `[Source]` vs `[Preview]`; within Source: `[Review]` vs `[Raw Data]`; prediction inspector in bottom sheet.
- **Loading Behavior:** Parsing spinner with "Parsing Spreadsheet Data..." status.
- **Empty Behavior:** Full dropzone prompt supporting CSV, TXT, XLS, XLSX, PDF.
- **Error Behavior:** Parse failure banner with format diagnosis; template generation error tags.
- **Preserved Functionality:** PDF/CSV/Spreadsheet parser, Handlebars template engine, TF-IDF predictions, merchant mapping persistence, overwrite/create save modal.

#### 20. `/ledger/posting` — Postings

- **Page Name:** Postings
- **Primary Archetype:** Data Explorer
- **Primary Question:** What individual posting entries exist across all accounts?
- **Page Header:** Title: "Postings", Description: "All individual postings across journal accounts"; Subtoolbar: Date range selector.
- **Primary Information:** Dense, virtualized list or Tabulator table of individual postings.
- **Secondary Information:** Associated transaction dates, payees, commodity tags.
- **Primary Actions:** Account filter, Search query.
- **Desktop Composition:** Search/filter bar $\rightarrow$ Full-width dense postings data table with right-aligned amounts.
- **Mobile Transformation:** Postings list with compact multi-line records.
- **Loading Behavior:** Table row skeletons.
- **Empty Behavior:** ZeroState indicating no postings match query.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** High-performance tabular rendering, transaction link drill-down.

#### 21. `/ledger/price` — Prices

- **Page Name:** Prices
- **Primary Archetype:** Data Explorer
- **Primary Question:** What historical commodity and exchange rate price quotes exist?
- **Page Header:** Title: "Prices", Description: "Historical commodity prices and currency exchange rates".
- **Primary Information:** Commodity price history table (Date, Commodity, Currency, Price).
- **Secondary Information:** Commodity search filter.
- **Primary Actions:** Filter by commodity, Update prices sync.
- **Desktop Composition:** Commodity filter bar $\rightarrow$ Tabulator price table with right-aligned prices.
- **Mobile Transformation:** Compact price record list.
- **Loading Behavior:** Skeleton table rows.
- **Empty Behavior:** ZeroState indicating no price quotes recorded.
- **Error Behavior:** Local error alert.
- **Preserved Functionality:** `hledger` price directive parsing, price update synchronization.

#### 22. `/ledger/transaction` — Transactions

- **Page Name:** Transactions
- **Primary Archetype:** Data Explorer
- **Primary Question:** What transactions match my query, and how do I bulk edit them?
- **Page Header:** Title: "Transactions", Description: "Journal transactions, search, and bulk edits"; Actions: Transaction count badge, Download/Export button.
- **Primary Information:** Virtualized list of transactions with date, payee, posting accounts, commodity amounts.
- **Secondary Information:** Search autocomplete suggestions (accounts, commodities, files).
- **Primary Actions:** Search query input, Bulk Edit toggle, Download balanced postings, Preview Bulk Edit modal.
- **Desktop Composition:** Search toolbar with bulk edit button $\rightarrow$ Slide-down `BulkEditForm` $\rightarrow$ Virtualized transaction stream.
- **Mobile Transformation:** Full-width search $\rightarrow$ Transaction records stack $\rightarrow$ Bulk edit in full modal.
- **Loading Behavior:** Pulsing transaction card skeletons.
- **Empty Behavior:** ZeroState indicating no transactions match query.
- **Error Behavior:** Local error alert.
- **Preserved Functionality:** CodeMirror search query parser, virtual list performance, 3-step bulk edit (Configure $\rightarrow$ Preview Diff $\rightarrow$ Save), balanced postings export.

#### 23. `/liabilities/balance` — Liabilities Balance

- **Page Name:** Liabilities Balance
- **Primary Archetype:** Analysis
- **Primary Question:** What are my outstanding balances across loans and credit lines?
- **Page Header:** Title: "Liabilities Balance", Description: "Outstanding debts, loans, and credit lines".
- **Primary Information:** Liabilities breakdown tree table (Drawn, Repaid, Balance, Interest, APR).
- **Secondary Information:** Account grouping hierarchy.
- **Primary Actions:** Expand/Collapse tree nodes.
- **Desktop Composition:** Tabulator hierarchical tree table with right-aligned currency and APR columns.
- **Mobile Transformation:** Collapsible liability account cards with balance and APR badges.
- **Loading Behavior:** Skeleton tree rows.
- **Empty Behavior:** "Hurray! You have no liabilities" message banner.
- **Error Behavior:** Local error box.
- **Preserved Functionality:** Hierarchical tree grouping, APR computation.

#### 24. `/liabilities/credit_cards` — Credit Cards

- **Page Name:** Credit Cards
- **Primary Archetype:** Overview
- **Primary Question:** What is the utilization, bill status, and balance of all credit cards?
- **Page Header:** Title: "Credit Cards", Description: "Credit card utilization, statement due dates, and balances".
- **Primary Information:** Overview grid of `CreditCardCard` components showing limits, balances, due dates.
- **Secondary Information:** Total available credit, aggregate utilization rate.
- **Primary Actions:** Card selection link to detail route.
- **Desktop Composition:** Summary metrics $\rightarrow$ Responsive grid of `CreditCardCard` items.
- **Mobile Transformation:** Vertical stack of compact card summaries.
- **Loading Behavior:** Card frame skeletons.
- **Empty Behavior:** ZeroState with documentation link to configure credit cards in settings.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Statement cycle calculation, due date alerting, payment status detection.

#### 25. `/liabilities/credit_cards/[slug]` — Credit Card Detail

- **Page Name:** Credit Card Detail
- **Primary Archetype:** Detail
- **Primary Question:** What is the bill history and transaction breakdown for this specific credit card?
- **Page Header:** Title: Card account name (e.g. `Liabilities:CreditCard:Freedom`); Breadcrumb back to Credit Cards.
- **Primary Information:** Primary state: Amount Due, Due Date, Utilization.
- **Secondary Information:** Statement equation ($Opening + Purchases - Credits = Due$), Yearly spending chart, Statement transactions.
- **Primary Actions:** Statement period selector dropdown.
- **Desktop Composition:** Top operational state strip $\rightarrow$ Statement equation strip $\rightarrow$ Yearly spends chart $\rightarrow$ Statement transactions list.
- **Mobile Transformation:** Amount Due & Due Date first $\rightarrow$ Utilization $\rightarrow$ Statement equation $\rightarrow$ Chart $\rightarrow$ Transactions.
- **Loading Behavior:** Skeletons for bill header and transaction list.
- **Empty Behavior:** Message indicating no statement history found for this card.
- **Error Behavior:** Local error with redirect back to Credit Cards overview.
- **Preserved Functionality:** Statement period filtering, statement equation calculation, ECharts yearly spends chart.

#### 26. `/liabilities/interest` — Interest Analysis

- **Page Name:** Interest Breakdown
- **Primary Archetype:** Analysis
- **Primary Question:** How much interest am I paying across borrowing facilities?
- **Page Header:** Title: "Interest Breakdown", Description: "Interest payments and rates across all liabilities".
- **Primary Information:** Interest overview timeline chart with legends.
- **Secondary Information:** Per-account interest timeline breakdown with summary tables.
- **Primary Actions:** Period toggle.
- **Desktop Composition:** Legend card $\rightarrow$ ECharts interest overview chart $\rightarrow$ Per-account breakdown rows (Summary card + Chart).
- **Mobile Transformation:** Legend card $\rightarrow$ Responsive overview chart $\rightarrow$ Stacked per-account cards.
- **Loading Behavior:** ECharts chart skeletons.
- **Empty Behavior:** EmptyState indicating no liability interest activity.
- **Error Behavior:** Local error alert.
- **Preserved Functionality:** ECharts interest timeline charts, per-account rendering.

#### 27. `/liabilities/repayment` — Loan Repayment

- **Page Name:** Loan Repayment
- **Primary Archetype:** Analysis
- **Primary Question:** What is the principal vs interest amortisation progress on debts?
- **Page Header:** Title: "Loan Repayment", Description: "Principal repayment vs interest amortisation progress".
- **Primary Information:** Loan amortisation and repayment progress charts.
- **Secondary Information:** Principal repaid vs outstanding debt breakdown.
- **Primary Actions:** Account selector.
- **Desktop Composition:** Summary metrics $\rightarrow$ Repayment amortisation chart $\rightarrow$ Repayment schedule table.
- **Mobile Transformation:** Summary metrics $\rightarrow$ Repayment chart $\rightarrow$ Schedule cards.
- **Loading Behavior:** Skeleton chart frame.
- **Empty Behavior:** ZeroState indicating no active amortising loans.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Principal vs interest ratio computation, repayment tracking.

#### 28. `/more/about` — About

- **Page Name:** About
- **Primary Archetype:** Tool
- **Primary Question:** What version of Paisa is running and where are documentation and community resources?
- **Page Header:** Title: "About Paisa".
- **Primary Information:** Paisa Logo, Application version number (`0.8.1`).
- **Secondary Information:** Community & support links (Documentation, Issues, Discussions, Chat, Source Code, Releases, Demo).
- **Primary Actions:** External link opener (handling web browser vs desktop runtime).
- **Desktop Composition:** Centered card (max-w-md): Logo + Version $\rightarrow$ Structured links card.
- **Mobile Transformation:** Full-width centered stack.
- **Loading Behavior:** Instant render.
- **Empty Behavior:** N/A.
- **Error Behavior:** N/A.
- **Preserved Functionality:** `window.runtime.BrowserOpenURL` desktop integration.

#### 29. `/more/config` — Configuration

- **Page Name:** Configuration
- **Primary Archetype:** Configuration
- **Primary Question:** How do I configure system parameters, accounts, and rules in `paisa.yaml`?
- **Page Header:** Title: "Configuration", Description: "Edit paisa.yaml by section. Save writes the file and re-syncs the journal.", Actions: Unsaved changes badge.
- **Primary Information:** Dynamic JSON Schema form fields for active section (General, Budget, Goals, Prediction, Accounts, Allocation Targets, Commodities, Credit Cards, Import Templates, Schedule AL, User Accounts).
- **Secondary Information:** Section item counters, schema field descriptions.
- **Primary Actions:** Section selector, Reset to defaults, Discard changes, Save changes.
- **Desktop Composition:** PageHeader with unsaved changes badge $\rightarrow$ Section with horizontal boxed section tabs selector $\rightarrow$ Active section surface with header count badge and schema fields $\rightarrow$ Sticky bottom save/discard bar.
- **Mobile Transformation:** Top horizontal scrollable section tabs $\rightarrow$ Vertical form fields $\rightarrow$ Sticky bottom save/discard bar.
- **Loading Behavior:** Settings panel skeleton.
- **Empty Behavior:** N/A (schema default fallback).
- **Error Behavior:** Schema validation error alert box.
- **Preserved Functionality:** Dynamic `JsonSchemaForm`, complex tabular array sections (Credit cards, Allocation targets, Templates), journal re-sync on save.

#### 30. `/more/doctor` — Doctor

- **Page Name:** Doctor
- **Primary Archetype:** Tool
- **Primary Question:** Are there any journal syntax, account, or configuration diagnostics?
- **Page Header:** Title: "Doctor", Description: "Diagnostic checks for journal health and configuration issues".
- **Primary Information:** Issue counter banner with pass/fail color status.
- **Secondary Information:** Diagnosis issue cards and recommendations.
- **Primary Actions:** Re-run diagnosis.
- **Desktop Composition:** Issue count banner $\rightarrow$ Grid of Diagnosis issue cards.
- **Mobile Transformation:** Issue count banner $\rightarrow$ Stack of issue cards.
- **Loading Behavior:** Spinner with "Running diagnostic checks...".
- **Empty Behavior:** "0 potential issues found" clean health banner.
- **Error Behavior:** Diagnostic runner failure alert.
- **Preserved Functionality:** Diagnosis renderer, error classification.

#### 31. `/more/goals` — Goals Overview

- **Page Name:** Goals
- **Primary Archetype:** Overview
- **Primary Question:** How am I progressing toward my retirement and savings targets?
- **Page Header:** Title: "Financial Goals", Description: "Prioritize and track progress towards retirement, savings, and custom targets".
- **Primary Information:** Drag-and-drop prioritized list of `GoalSummaryCard` components.
- **Secondary Information:** Target amounts, current savings, progress percentages, SWR.
- **Primary Actions:** Drag-to-reorder goal priority, Click goal to open detail route.
- **Desktop Composition:** Grid of `GoalSummaryCard` components with reorder drag handles.
- **Mobile Transformation:** Single-column list of goal cards with touch drag handles.
- **Loading Behavior:** Goal card skeleton placeholders.
- **Empty Behavior:** ZeroState with documentation link to configure goals in settings.
- **Error Behavior:** Local error notification.
- **Preserved Functionality:** `svelte-dnd-action` drag-to-reorder, automatic priority config update (`/api/config`).

#### 32. `/more/goals/retirement/[slug]` — Retirement Goal Detail

- **Page Name:** Retirement Goal Detail
- **Primary Archetype:** Detail
- **Primary Question:** What is the savings runway and corpus projection for retirement?
- **Page Header:** Title: Goal icon + Name; Description: "Retirement goal tracking, forecast, and portfolio health".
- **Primary Information:** MetricStrip (Net Investment, Current Savings, Yearly Expenses, Target Savings), Progress with breakpoints bar.
- **Secondary Information:** ARIMA Forecast progress timeline chart, Monthly investment chart, Current balance breakdown, Recent goal postings list.
- **Primary Actions:** Forecast model update.
- **Desktop Composition:** MetricStrip $\rightarrow$ Progress bar $\rightarrow$ Main panel (Progress chart + Investment chart + Balance) \| Side panel (Recent postings).
- **Mobile Transformation:** Metrics $\rightarrow$ Progress bar $\rightarrow$ Progress chart $\rightarrow$ Investment chart $\rightarrow$ Balance $\rightarrow$ Recent postings.
- **Loading Behavior:** Metric strip and ECharts chart skeletons.
- **Empty Behavior:** ZeroState for goals without linked investment accounts.
- **Error Behavior:** ARIMA forecast calculation fallback banner.
- **Preserved Functionality:** Client-side ARIMA forecasting (`arima/async`), breakpoint milestone computation, ECharts progress & investment timeline charts.

#### 33. `/more/goals/savings/[slug]` — Savings Goal Detail

- **Page Name:** Savings Goal Detail
- **Primary Archetype:** Detail
- **Primary Question:** What is the progress, timeline, and deposit history for this savings goal?
- **Page Header:** Title: Goal icon + Name; Description: "Savings target tracking, timeline, and balance".
- **Primary Information:** MetricStrip (Target Amount, Current Savings, Remaining Amount, Projected Completion).
- **Secondary Information:** Progress timeline chart, Linked asset balances, Recent contribution postings.
- **Primary Actions:** Back to Goals.
- **Desktop Composition:** MetricStrip $\rightarrow$ Progress bar $\rightarrow$ Savings timeline chart $\rightarrow$ Linked balances \| Recent postings.
- **Mobile Transformation:** Ordered vertical stack: Metrics $\rightarrow$ Progress bar $\rightarrow$ Chart $\rightarrow$ Balances $\rightarrow$ Postings.
- **Loading Behavior:** Skeletons for metrics and chart.
- **Empty Behavior:** ZeroState indicating no contributions found for goal.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Goal target calculation, linked asset balance summation.

#### 34. `/more/logs` — Logs

- **Page Name:** Logs
- **Primary Archetype:** Tool
- **Primary Question:** What structured server and application logs were recorded?
- **Page Header:** Title: "Logs", Description: "Application log viewer with level filtering and structured fields".
- **Primary Information:** Virtualized list of structured log entries (Timestamp, Level tag, Message, Structured key-value fields).
- **Secondary Information:** Log level color indicators (info, warning, error, fatal).
- **Primary Actions:** Scroll logs, Filter by level.
- **Desktop Composition:** Full-width virtualized log stream with monospace structured fields (`height: calc(100vh - 130px)`).
- **Mobile Transformation:** Horizontally scrollable structured log cards.
- **Loading Behavior:** Skeleton log rows.
- **Empty Behavior:** Message indicating no logs recorded in buffer.
- **Error Behavior:** Log reader connection error banner.
- **Preserved Functionality:** `svelte-tiny-virtual-list` virtual scrolling, structured JSON field formatting.

#### 35. `/more/sheets` — Sheets (Root)

- **Page Name:** Sheets
- **Primary Archetype:** Tool
- **Primary Question:** What custom calculation sheets exist in the workspace?
- **Page Header:** Title: "Sheets", Description: "Interactive financial scratchpads and calculation sheets".
- **Primary Information:** List of `.paisa` sheet files in workspace.
- **Secondary Information:** File size and last modified date.
- **Primary Actions:** Create new sheet modal, Open existing sheet.
- **Desktop Composition:** File list grid $\rightarrow$ Create Sheet CTA.
- **Mobile Transformation:** Vertical sheet files list.
- **Loading Behavior:** Skeleton file list.
- **Empty Behavior:** Prompt to create first `.paisa` sheet.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Redirect to default `overview.paisa` sheet if present.

#### 36. `/more/sheets/[slug]` — Sheet Detail

- **Page Name:** Sheet Detail
- **Primary Archetype:** Detail / Tool
- **Primary Question:** How do I edit and evaluate this specific `.paisa` sheet?
- **Page Header:** Workspace toolbar: Create sheet, Save (`Ctrl+S`), Undo/Redo, Version history revert, Evaluation duration badge (`ms`), Error count.
- **Primary Information:** Split CodeMirror sheet editor with live evaluated line-by-line result gutter on right.
- **Secondary Information:** FileTree sidebar for sheet files.
- **Primary Actions:** Save, Create sheet, Revert backup, Delete backups.
- **Desktop Composition:** Top toolbar $\rightarrow$ Sidebar (FileTree 180px) \| Editor (min 75%) + Live Result Gutter (25%).
- **Mobile Transformation:** Fullscreen sheet editor with tab to view Evaluation Results.
- **Loading Behavior:** Editor skeleton frame.
- **Empty Behavior:** Prompt indicating sheet is empty.
- **Error Behavior:** Line-level error highlight in result gutter with error count badge.
- **Preserved Functionality:** Real-time client-side sheet expression evaluator, line-aligned result gutter, autocompletions for accounts/commodities/files.

#### 37. `/more/tax/capital_gains` — Capital Gains Tax

- **Page Name:** Capital Gains Tax
- **Primary Archetype:** Analysis
- **Primary Question:** What is my short-term vs long-term capital gains tax liability?
- **Page Header:** Title: "Capital Gains", Description: "Financial year capital gains summary and asset realization".
- **Primary Information:** List of `CapitalGainCard` components for each financial year.
- **Secondary Information:** Short-Term Capital Gains (STCG), Long-Term Capital Gains (LTCG), Total tax liability.
- **Primary Actions:** Financial year expand/collapse.
- **Desktop Composition:** Vertical stack of `CapitalGainCard` components grouped by financial year.
- **Mobile Transformation:** Stack of compact annual capital gain cards.
- **Loading Behavior:** Skeleton card placeholders.
- **Empty Behavior:** ZeroState indicating no capital gains realized in journal.
- **Error Behavior:** Local error banner.
- **Preserved Functionality:** Indian Income Tax STCG/LTCG holding period logic, asset realization calculations.

#### 38. `/more/tax/harvest` — Tax Harvesting

- **Page Name:** Tax Loss Harvesting
- **Primary Archetype:** Analysis
- **Primary Question:** Which investment lots can be harvested for tax loss/gain optimization?
- **Page Header:** Title: "Tax Loss Harvesting", Description: "Identify tax-saving opportunities by offsetting capital gains with losses".
- **Primary Information:** Grid of harvestable asset cards showing unrealized losses, gains, and potential tax savings.
- **Secondary Information:** Lot holding duration (short-term vs long-term classification).
- **Primary Actions:** View harvestable lots.
- **Desktop Composition:** Responsive grid of harvestable asset cards .
- **Mobile Transformation:** Single-column list of harvestable opportunity cards.
- **Loading Behavior:** Skeleton card frames.
- **Empty Behavior:** "No tax harvesting opportunities found" clean status banner.
- **Error Behavior:** Local error box.
- **Preserved Functionality:** ECharts harvestables renderer, lot-level tax offset calculations.

#### 39. `/more/tax/schedule_al` — Schedule AL

- **Page Name:** Schedule AL
- **Primary Archetype:** Data Explorer
- **Primary Question:** What is the formal Asset and Liability statement for tax filing?
- **Page Header:** Title: "Schedule AL", Description: "Statement of Assets and Liabilities for Income Tax filing"; Subtoolbar: Financial year picker.
- **Primary Information:** Schedule AL report table (Code, Section, Details, Right-aligned Amount).
- **Secondary Information:** As-of date timestamp.
- **Primary Actions:** Financial year selector.
- **Desktop Composition:** As-of date indicator $\rightarrow$ Full-width dense Schedule AL table .
- **Mobile Transformation:** Responsive table with horizontal scroll and right-aligned amount column.
- **Loading Behavior:** Skeleton table rows.
- **Empty Behavior:** ZeroState indicating no Schedule AL data for selected financial year.
- **Error Behavior:** Local error alert.
- **Preserved Functionality:** Schedule AL breakdowns renderer, Indian tax schedule formatting.

#### 40. `/insights` — Insights

- **Page Name:** Insights
- **Primary Archetype:** Analysis
- **Primary Question:** What changed in my finances this month and why?
- **Page Header:** Title: "Insights"; Subtoolbar: Month picker, Category filter pills, Grid/List view toggle.
- **Primary Information:** InsightsSummaryBar (total insights count, severity breakdown), Grid or list of `InsightCard` components.
- **Secondary Information:** Per-insight detail: value change, percentage change, comparison period, driver account, baseline quality indicators.
- **Primary Actions:** Month selector, Category filter (All, Spending, Savings, Net Worth, Budget, Recurring, Investments, Cash), View mode toggle (grid/list).
- **Desktop Composition:** PageHeader with month picker $\rightarrow$ Category filter BoxedTabs $\rightarrow$ InsightsSummaryBar $\rightarrow$ ResponsiveGrid of InsightCard components.
- **Mobile Transformation:** Month picker $\rightarrow$ Category pills (horizontal scroll) $\rightarrow$ Summary bar $\rightarrow$ Single-column InsightCard stack.
- **Loading Behavior:** Spinner with "Loading insights..." status.
- **Empty Behavior:** ZeroState indicating no insights available for the selected period.
- **Error Behavior:** Local error banner with retry.
- **Preserved Functionality:** Backend-computed insights with period comparison, category filtering, severity scoring, baseline quality assessment, drill-down navigation via `href` links to relevant pages.

#### 41. `/login` — Login

- **Page Name:** Login
- **Primary Archetype:** Tool
- **Primary Question:** How do I authenticate to access the Paisa workspace?
- **Page Header:** Standalone view without standard navigation shell.
- **Primary Information:** Centered login box: Paisa Logo, Username input, Password input, Login CTA.
- **Secondary Information:** Authentication failure error message.
- **Primary Actions:** Submit login credentials.
- **Desktop Composition:** Centered card (max-w-md): Logo $\rightarrow$ Username/Password fields $\rightarrow$ Primary Submit Button.
- **Mobile Transformation:** Full-bleed centered mobile form with touch-friendly inputs ($\ge 44\text{px}$).
- **Loading Behavior:** Button loading state during authentication attempt.
- **Empty Behavior:** Form ready for input.
- **Error Behavior:** Red inline error message below password field using semantic `text-negative` styling.
- **Preserved Functionality:** `login(username, password)` core authentication utility, redirect to `/` on success.

---

## 18. Critical Functionality Preservation Guarantees

Ongoing frontend maintenance and future enhancements must guarantee that no existing capability is lost or degraded during visual refinement.

### 18.1 Ledger Import Preservation Guarantees

- **Supported Formats:** CSV, TXT, XLS, XLSX, PDF.
- **Template Capabilities:** Built-in template protection (cannot delete built-ins; saving forks to custom), Handlebars custom templating, column index binding (`ROW.A`), `Reverse` and `Trim` switches.
- **Prediction Engine:** Preserves all five prediction states (**High**, **Medium**, **Review**, **Unknown**, **Possible Transfer**); prediction override; "Apply to Similar" batch override; persistent merchant rule saving.
- **Dual View Modes:** Source pane must support both `[ Review ]` and `[ Raw Data ]` modes. Raw Data exposes original statement columns for diagnosing statement format changes.
- **Preview & Output:** Live CodeMirror ledger preview, syntax error reporting, copy to clipboard, save to existing or new `.ledger` file.

### 18.2 Ledger Editor Preservation Guarantees

- **Autocompletion:** Accounts, Payees, Commodities.
- **Keyboard Shortcuts:** `Ctrl+S` (Save), `Ctrl+I` (Prettify/Format), `Ctrl+Z` (Undo), `Ctrl+Y` (Redo).
- **Safety:** `beforeNavigate` unsaved change confirmation, version history snapshotting, backup restoration and backup deletion.
- **Diagnostics:** Real-time `hledger` validation error reporting with click-to-jump line navigation.
- **Output:** Live balance / validation output panel.

### 18.3 Transactions & Bulk Edit Preservation Guarantees

- **Search Syntax:** Full query parser support (`payee:...`, `account:...`, `commodity:...`).
- **Virtualization:** High-performance scrolling over thousands of entries.
- **Bulk Edit Workflow:** Must follow the safe 3-step sequence: **Configure Edit $\rightarrow$ Preview Diff Modal $\rightarrow$ Save**. Direct destructive in-place modification without preview is forbidden.

### 18.4 Budget Preservation Guarantees

- **Calculation Integrity:** Checking liquid balance context, Available to Budget calculation, Spend remaining forecast, Projected month-end balance.
- **Visuals:** Category spending progress bars, deficit alerts. (Do not invent an envelope reallocation engine unless supported by backend).

### 18.5 Configuration Preservation Guarantees

- **Section Inventory:** General, Budget, Goals, Prediction, Accounts, Allocation Targets, Commodities, Credit Cards, Import Templates, Schedule AL, User Accounts.
- **Complex Sections:** Support for complex tabular schema sections (e.g. Allocation target percentages, Credit card limits/due dates).

---

## 19. Testing & Visual Regression Strategy

All components and routes are verified against the Playwright visual regression and browser test suite (`frontend/tests/browser/`).

### 19.1 Target Test Matrix

Every route is validated across four canonical viewport and theme variants:

1. **Desktop Light:** $1440\text{px} \times 900\text{px}$, light theme.
2. **Desktop Dark:** $1440\text{px} \times 900\text{px}$, dark theme.
3. **Mobile Light:** $390\text{px} \times 844\text{px}$, light theme.
4. **Mobile Dark:** $390\text{px} \times 844\text{px}$, dark theme.

### 19.2 Automated Verification Criteria

- Zero horizontal overflow on mobile viewports.
- Stable layout geometry under loading, empty, and partial states.
- Exact chart rendering and resize observer behavior.
- Interactive dialog focus trapping and keyboard escape handling.

---

## 20. Migration Retrospective

The frontend migration has been completed. The following phases were executed:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Canonical UI/UX Specification ✓                     │
│   • This document was created as the design contract        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: UI Foundation & Design Lab ✓                        │
│   • Tailwind CSS v4 Setup (Semantic Tokens, Preflight)      │
│   • Core Paisa UI Primitives (Button, Dialog, Input, etc.)  │
│   • Interactive Design Lab (/dev/ui)                        │
│   • CSS Layer Architecture (@layer theme, base, ...)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: Core Validation Slice ✓                             │
│   1. Dashboard (Validates Shell, Metrics, ECharts)           │
│   2. Transactions (Validates Data Explorer, Virtualization) │
│   3. Ledger Import (Validates Multi-Pane Workflow & Rules)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: Archetype-by-Archetype Route Migration ✓            │
│   • All Analysis, Data Explorer, Detail, Operational,       │
│     Configuration, and Tool routes migrated                 │
│   • D3.js fully replaced by ECharts 6                       │
│   • 5-area library architecture enforced                    │
│   • New feature: Insights page (/insights)                  │
│   • Command Palette implemented (Ctrl+K / Cmd+K)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 7: Final Decommissioning & Preflight Enablement ✓      │
│   • Bulma Removal Complete (Bulma = 0)                      │
│   • SCSS Removal Complete (Sass = 0)                        │
│   • Tailwind CSS v4 Preflight Enabled                       │
│   • Playwright Visual Regression Suite Operational           │
└─────────────────────────────────────────────────────────────┘
```

---

## 21. Architectural Boundaries

The following boundaries are enforced to maintain code quality:

- **No Backend Changes:** Go backend APIs, ledger CLI invocations, and calculations remain untouched by frontend work.
- **No Financial Math Alteration:** Formatting, XIRR calculations, gain/loss logic, and balance equations remain identical.
- **No Routing Structure Changes:** All existing 41 SvelteKit route URLs are stable. New routes require spec updates.
- **No ECharts Replacement:** ECharts 6 is the chart rendering engine; alternative chart libraries are not introduced.
- **No CodeMirror Replacement:** CodeMirror 6 remains the editor engine.
- **No Immediate Tabulator Removal:** Tabulator remains wrapped inside `<Table />`.
- **Library Boundary Enforcement:** `deno task architecture` enforces the 5-area ownership model (§12.1). Domain cannot depend on UI; shared cannot depend on features.
- **No Bulma/SCSS Regression:** No new Bulma classes, SCSS files, or `@import "bulma"` rules may be added.

---

## 22. Known Ambiguities & Product Clarifications

During repository inspection, the following discrepancies were identified and resolved:

1. **Tax Section Visibility:** The `Tax` navigation group is dynamically visible only when `USER_CONFIG.default_currency == "INR"`. This conditional display rule is enforced.
2. **Non-Route Navigation Groups:** `Cash Flow`, `Expenses`, `Assets`, and `Liabilities` do not have standalone index page routes; they are expandable navigation groups.
3. **Transaction Edit Execution:** Direct destructive in-place editing is rejected in favor of Paisa's canonical safe 3-step Bulk Edit flow (Configure $\rightarrow$ Preview Diff $\rightarrow$ Save).
4. **Mockup Feature Boundaries:** Features not supported by the Paisa engine (Pay Now, direct banking transfers, receipt uploads, embedded terminals, Vim modes) are excluded.
5. **Token File Duality:** Two token files exist: `foundation.css` (core semantic tokens + Tailwind mapping) and `tokens.css` (extended token set for component-specific theming). Both are canonical; `foundation.css` is the primary Tailwind integration point.

---

## 23. Migration Completion Status

The frontend migration is complete. All deliverables have been met:

- [x] All 41 production routes are inventoried and have canonical design contracts.
- [x] All 8 core page archetypes are defined with structural desktop and mobile wireframes.
- [x] Desktop to mobile layout transformations are explicitly defined.
- [x] Critical existing business functionality (Import parsing/prediction, Editor balance validation, Bulk edit preview, Budget forecasts) is preserved.
- [x] Global AppShell, Information Architecture, semantic tokens, typography, and state models are documented.
- [x] Architectural boundaries and library ownership rules are established and enforced.
- [x] Bulma fully removed (Bulma = 0), SCSS fully removed (Sass = 0), Tailwind Preflight enabled.
- [x] D3.js fully replaced by ECharts 6 across all visualization routes.
- [x] 5-area library architecture (`api/`, `domain/`, `features/`, `shared/`, `generated/`) enforced via `deno task architecture`.
- [x] Command Palette (`Ctrl+K` / `Cmd+K`) implemented.
- [x] Insights page (`/insights`) added as route #40.
- [x] Development UI Design Lab (`/dev/ui`) operational.
- [x] Prediction-specific color tokens added for import workflow confidence visualization.

---
*End of As-Built UI/UX Specification*
