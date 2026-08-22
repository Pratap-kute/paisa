# Frontend library structure

- `api/`: API workflows that coordinate backend requests and UI feedback.
- `charts/`: renderer-independent financial adapters and internal ECharts option
  builders. Paisa chart components render through `EChartSurface`; ordinary UI
  uses Svelte, HTML, and CSS.
- `components/`: Svelte components grouped as `layout`, `ui`, `ledger`,
  `transactions`, and `finance`.
- `core/`: broadly shared browser utilities, colors, icons, persistence, and
  notifications.
- `domain/`: framework-light financial and transaction calculations.
- `editors/`: CodeMirror editor construction and editor-specific adapters.
- `importing/`: document parsing, spreadsheet/PDF import, export, and template
  helpers.
- `ledger/`: ledger text formatting and bulk-edit operations.
- `search/` and `sheet/`: generated parsers plus their language runtimes.
- `tables/`: shared Tabulator formatting functions.

Prefer the narrowest applicable folder. Keep route-specific orchestration in
`src/routes`, and avoid barrel files so dependencies remain explicit.
