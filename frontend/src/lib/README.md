# Frontend library architecture

Paisa's frontend library has five ownership areas:

- `api/` owns backend transport, generated API DTOs, authentication headers,
  response date revival, request lifecycle, and API error normalization. The
  OpenAPI client remains in `api/generated/Api.ts`.
- `domain/` owns framework-independent financial concepts and calculations,
  including postings, account names, assets, cash flow, liabilities, tax, goals,
  recurring transactions, and date calculations.
- `features/` owns business-specific UI and data preparation. Expense chart
  transforms belong to `features/expense/`; portfolio and net-worth transforms
  belong to `features/assets/`.
- `shared/` owns reusable presentation and infrastructure with no business
  feature dependency: UI primitives, layouts, ECharts rendering, CodeMirror
  foundations, browser preferences, formatting, and generic collections.
- `generated/` contains generator output only. Lezer grammars, fixtures,
  highlighting, tests, and CodeMirror adapters are handwritten elsewhere; only
  `parser.js` and `parser.terms.js` are generated here.

Routes own page URLs, loading orchestration, and composition. They may combine
API, feature, and shared modules, but reusable calculations, transport wrappers,
and chart transformations do not belong in route files.

## Where should this code go?

| Code                                          | Owner                              |
| --------------------------------------------- | ---------------------------------- |
| Backend request, authentication, or API DTO   | `api/`                             |
| Pure financial calculation shared by features | `domain/`                          |
| Expense-specific UI or visualization data     | `features/expense/`                |
| Reusable Button, Dialog, or layout primitive  | `shared/ui/` or `shared/layout/`   |
| Generic ECharts renderer or option contract   | `shared/charts/`                   |
| Editable Lezer grammar or editor adapter      | owning feature or `shared/editor/` |
| Generated Lezer parser artifact               | `generated/`                       |
| Page URL and feature composition              | `routes/`                          |

Choose the narrowest semantic owner. Do not introduce catch-all `utils.ts`,
`helpers.ts`, `common.ts`, or `misc.ts` modules, and avoid barrel files unless a
public boundary genuinely needs one.

## Enforced dependencies

`deno task architecture` checks `$lib` and relative imports in TypeScript,
JavaScript, and Svelte files. Domain cannot depend on Svelte, routes, features,
UI, or API transport. Shared cannot depend on features or routes. Features and
generated output cannot depend on routes, and API cannot depend on routes or
feature implementations. `deno task check` runs this boundary check first.

## Deferred route candidates

The route-thinness audit found follow-up candidates in the ledger import page,
ledger editor, sheet editor, dashboard, configuration, expense analysis, and
income-statement pages. They retain substantial page controller or presentation
state, but splitting them here would expand this cleanup into another feature
rewrite.
