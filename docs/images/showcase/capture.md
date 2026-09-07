# Showcase capture manifest

All media comes from this checkout running locally, never an upstream website.
Audited application commit: `ae11475933ede60da058272e72f155d47c474c02`.

## Reproduce

Use the repository's development environment (`nix develop` where available),
including Deno, Go, SQLite, and Chromium matching Playwright. In two terminals:

```sh
cd frontend
deno run -A scripts/test_server.ts
```

Once the server reports `http://127.0.0.1:5173/`:

```sh
cd frontend
deno run -A scripts/capture_showcase.ts
# Optional; requires ffmpeg:
deno run -A scripts/encode_showcase.ts
```

Stop the server with Ctrl+C to remove its temporary fixture database. If Go's
normal cache is not writable, set `GOCACHE` to a writable temporary directory.
Capture is manual; it does not regenerate visual regression baselines.

The server builds the checked-out app, copies `frontend/tests/fixture/browser`
into a temporary directory, syncs the journal without fetching prices, and seeds
synthetic portfolio allocations. Its Ledger stub supports editor display validation;
these captures are not evidence of real Ledger CLI validation or saving behavior.
The capture script never saves the imported statement or edits journal contents.

## Screen states

Chromium, 1440×900 viewport, device scale 1, light theme, `en-IN`, UTC,
backend date `2022-02-07`, browser clock `2022-02-07T12:00:00Z`.
Fonts and route-specific content must be ready, followed by 1.5 seconds for layout
and chart animation to settle. Cursor and focus are cleared before capture.

| Asset | Route | Required state |
| --- | --- | --- |
| `dashboard.png` | `/` | Dashboard cash-flow chart ready; fixture balances and insights loaded |
| `expenses-budget.png` | `/expense/budget` | February 2022; All Budgets visible, category spending loaded |
| `investments.png` | `/assets/analysis` | Portfolio security-type chart ready; seeded NIFTY composition |
| `import.png` | `/ledger/import` | Synthetic three-transaction CSV defined in capture script; Paytm template selected; generated 2022 journal visible |
| `ledger-editor.png` | `/ledger/editor/main.ledger` | Syntax-highlighted fixture journal open at its beginning |
| `goals-recurring.png` | `/more/goals` | Retirement and House fixture goals visible |
| `paisa-overview.gif` | Above screens | Dashboard → Budget → Portfolio Analysis → Import → Editor → Dashboard; 2 seconds each |

The GIF is a slideshow of actual captures, not a recording of mouse interactions.
It is 1200×750, 12 seconds, nominally 10 fps (unchanged frames may be coalesced),
with a generated palette and a 6 MiB maximum. Temporary encoding files are removed.
PNG screenshots are independently useful; README and Product Tour remain complete
without animation. If encoding fails, use `dashboard.png` as the overview.

The browser fixture intentionally exercises partial-data and planning warnings.
Do not hide those warnings or change application calculations for screenshots.
Investment imagery uses the populated Portfolio Analysis view; Investment
Performance is verified separately. If any capture cannot be produced, omit its
image reference and record the missing filename, route, readiness condition, and
failure in the implementation report. Never substitute upstream media.
