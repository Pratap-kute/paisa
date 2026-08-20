# Phase 4 Component Audit

Phase 4 builds the new UI foundation beside the legacy UI. Production-used
components are not visually restyled in this phase.

## Dependency Decisions

- Tailwind CSS: `tailwindcss@^4.3.3` and `@tailwindcss/vite@^4.3.3`.
- Bits UI: `bits-ui@^2.18.1`, used only inside Paisa-owned overlay primitives.
- Fonts: the repo already used Fontsource for Roboto; Inter and JetBrains Mono
  were added through the same Deno/npm model with
  `@fontsource-variable/inter@^5.3.0` and
  `@fontsource-variable/jetbrains-mono@^5.3.0`.

## Existing Shared Components

| Component      | Production use | Decision             | Notes                                                       |
| -------------- | -------------: | -------------------- | ----------------------------------------------------------- |
| `AppShell`     |            Yes | KEEP                 | No Phase 4 visual change.                                   |
| `Navbar`       |            Yes | KEEP                 | No nav or AppShell redesign.                                |
| `Page`         |            Yes | KEEP                 | Existing route layout remains unchanged.                    |
| `PageHeader`   |            Yes | KEEP                 | Existing page headers remain unchanged.                     |
| `Section`      |            Yes | KEEP                 | Existing section rhythm remains unchanged.                  |
| `MetricStrip`  |            Yes | KEEP / REPLACE LATER | Used by routes; new `Metric` composes with it in `/dev/ui`. |
| `ChartFrame`   |            Yes | KEEP                 | No D3 or chart frame restyle in Phase 4.                    |
| `Button`       |            Yes | KEEP                 | Existing Bulma-backed visuals remain unchanged.             |
| `Input`        |            Yes | KEEP                 | Existing form visuals remain unchanged.                     |
| `Select`       |  Likely shared | KEEP                 | Existing visuals remain unchanged.                          |
| `Checkbox`     |  Likely shared | KEEP                 | Existing visuals remain unchanged.                          |
| `Badge`        |            Yes | KEEP                 | Existing badge visuals remain unchanged.                    |
| `Tabs`         |            Yes | KEEP / REPLACE LATER | Existing tab visuals remain unchanged.                      |
| `Modal`        |            Yes | KEEP / REPLACE LATER | New `Dialog` and `Drawer` use Bits UI for future migration. |
| `Dropdown`     |         Shared | KEEP / REPLACE LATER | New menu/dropdown examples use Phase 4 surface classes.     |
| `Tooltip`      |         Shared | KEEP                 | Existing tippy integration remains unchanged.               |
| `EmptyState`   |         Shared | KEEP                 | No visual restyle.                                          |
| `ErrorState`   |            Yes | KEEP                 | No visual restyle.                                          |
| `LoadingState` |            Yes | KEEP                 | No visual restyle.                                          |
| `ZeroState`    |            Yes | KEEP                 | No visual restyle.                                          |
| `Table`        |            Yes | KEEP                 | Tabulator/table migration is out of scope.                  |

## New Phase 4 Components

- `Textarea`
- `Separator`
- `Skeleton`
- `Dialog`
- `Drawer`
- `Popover`
- `Metric`
- `DataToolbar`
- `FilterBar`
- `FormField`
- `FormSection`
- `WorkspacePane`
- `StatusBar`

## CSS Cascade Notes

Tailwind v4 utilities are imported in the `utilities` cascade layer. Existing
Bulma/SCSS is unlayered, so unlayered legacy declarations can outrank Tailwind
utilities even when `foundation.css` is imported later. Phase 4 components avoid
legacy class names such as `button`, `input`, `card`, `tabs`, and `tag` unless
intentionally reusing an existing production component.

Tailwind Preflight is disabled by importing only `tailwindcss/theme.css` and
`tailwindcss/utilities.css`; `tailwindcss/preflight.css` is intentionally
absent.
