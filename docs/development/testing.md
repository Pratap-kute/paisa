# Frontend testing

The frontend test stack has five layers:

- `deno task test:unit` runs Deno business-logic and fixture tests.
- `deno task test:core` runs the focused Vitest core-logic suite.
- `deno task test:component` runs Svelte component tests in `happy-dom`.
- `deno task test:e2e` runs Chromium against an isolated real backend and Vite
  frontend.
- `deno task test:visual` compares the Linux Chromium visual baselines.

Run all frontend checks with `deno task test:frontend`.
`deno task test:coverage` enforces a 60% minimum for statements, branches,
functions, and lines across maintainable core logic in
`src/lib/{core,domain,importing,ledger,sheet}`. It excludes generated parsers
and browser-only rendering modules. The core HTML and LCOV reports are written
to `coverage/core`.

Component coverage remains informational because route, chart, and Svelte
rendering code has a different testing cost profile. Its HTML and LCOV reports
are written to `coverage/component`. `deno task test:coverage:report` generates
both reports without enforcing the core threshold, which is useful while
investigating a temporary regression. Reports from different instrumentation
runners are not concatenated or treated as one coverage measurement.

## Nix and Playwright

Enter `nix develop` before running browser tests. The shell supplies the
Chromium build matching Playwright 1.61.1 through `PLAYWRIGHT_BROWSERS_PATH`;
browser downloads are not required.

The browser server copies the INR fixture into a temporary directory, uses UTC
and the fixed date `2022-02-07`, and removes the temporary database after the
run.

## Updating visual baselines

Run `deno task test:visual:update` inside the Linux Nix shell, review every
changed PNG, and commit intentional changes. Do not update screenshots merely to
make a failing test pass.

Failed CI runs upload `coverage`, `playwright-report`, and `test-results`
artifacts for seven days. Pull requests run the frontend suite, while direct
pushes run it only on `master`; stale runs are cancelled when a newer commit is
pushed. Documentation-only changes are skipped. The cross-platform packaged
desktop launch smoke runs weekly on Sunday and can be dispatched manually from
GitHub Actions.
