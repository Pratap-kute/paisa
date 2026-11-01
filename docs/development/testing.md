---
title: Testing
description: Run the Go backend, frontend unit, component, integration, browser, and visual test suites.
---

# Testing

Run everything that CI runs for unit-level checks with `make test`, and add
integration and browser tests with `make test-all`. Install the prerequisites in
[Contributor setup](setup.md) first; the integration and browser suites need
`ledger`, `hledger`, `beancount` 2.x, and `sqlite3` on your `PATH`.

## Go backend

```bash
make test-backend          # alias: make test-go
cd backend && go test ./...   # same suites, run directly
```

Backend packages carry their own unit tests. The API regression suite below
exercises them end to end against committed JSON baselines.

## Frontend

The frontend test stack has five layers:

- `bun run test:unit` runs Bun business-logic and fixture tests.
- `bun run test:core` runs the focused Vitest core-logic suite.
- `bun run test:component` runs Svelte component tests in `happy-dom`.
- `bun run test:e2e` runs Chromium against an isolated real backend and Vite
  frontend.
- `bun run test:visual` compares the Linux Chromium visual baselines.

Run all frontend checks with `bun run test:frontend`.
`bun run test:coverage` enforces a 60% minimum for statements, branches,
functions, and lines across maintainable core logic in
`src/lib/{domain,features,shared}`. The exact includes and exclusions are
defined in `frontend/vitest.config.ts`; generated parsers and selected browser-only
modules are outside the core coverage surface. The core HTML and LCOV reports are written
to `coverage/core`.

Component coverage remains informational because route, chart, and Svelte
rendering code has a different testing cost profile. Its HTML and LCOV reports
are written to `coverage/component`. `bun run test:coverage:report` generates
both reports without enforcing the core threshold, which is useful while
investigating a temporary regression. Reports from different instrumentation
runners are not concatenated or treated as one coverage measurement.

## Playwright and browser tests

Install the matching Chromium build before running browser tests:

```bash
cd frontend && bun run playwright install --with-deps chromium
```

When using the Dev Container, the required Chromium build and system dependencies are configured automatically.

The browser server copies the browser fixture journal and config into a
temporary directory, builds `paisa.db` with `paisa update`, seeds portfolio
holdings, uses UTC and the fixed date `2022-02-07`, and removes the temporary
database after the run.

## API regression fixtures

Integration tests under `frontend/tests/fixture/` keep committed JSON API
baselines plus journal/config source files. `paisa.db` files are not versioned;
each test run copies source files to a temporary directory and rebuilds the
database from the journal during sync.

Run the suite with `make test-integration` (it builds the binary first).

`make regen-fixtures` rewrites JSON baselines when API output changes. Regen
writes id-stripped JSON, so diffs show only meaningful schema or value changes.
Review the diff before committing. `make normalize-fixtures` can strip generated
ids from existing baselines without re-running the server.

## Updating visual baselines

Run `bun run test:visual:update` inside Linux or the Dev Container, review every
changed PNG, and commit intentional changes. Do not update screenshots merely to
make a failing test pass.

Failed CI runs upload `coverage`, `playwright-report`, and `test-results`
artifacts so differences can be inspected from the workflow summary.
