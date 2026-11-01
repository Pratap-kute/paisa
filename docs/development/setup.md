---
title: Contributor setup
description: Install the toolchain, run Paisa from source, and use the Makefile targets and Dev Container.
---

# Contributor setup

Paisa is a monorepo: a Go backend (`backend/`), a SvelteKit frontend
(`frontend/`), a Wails desktop app (`desktop/`), and these MkDocs docs
(`docs/`). The root `Makefile` coordinates all of them. Run `make help` to list
every target.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| Go | 1.26 (see `go.work`) | Backend, CLI, desktop app |
| Bun | 1.4.4 (see `packageManager` in `frontend/package.json`) | Frontend, scripts, tests |
| ledger | any recent release | Default journal engine |
| hledger | 1.52.x | `ledger_cli: hledger` fixtures and tests |
| beancount | 2.x (`pip install "beancount<3"`) | `ledger_cli: beancount` fixtures and tests |
| sqlite3 | any | Browser test fixture seeding |
| Python | 3.12+ | Documentation build |

## Dev Container (recommended)

Open the repository in VS Code and choose **Reopen in Container**. The
configuration in `.devcontainer/` installs Go, Bun, hledger, beancount 2.x,
MkDocs, and the Playwright Chromium build, then runs `bun install` and
`svelte-kit sync`. The Dev Container is also the supported place to update
visual snapshot baselines.

## First run from source

```bash
git clone https://github.com/Pratap-kute/paisa.git
cd paisa
cd frontend && bun install && cd ..
make build        # builds the frontend into backend/web/static and the Go binary
make dev          # backend on :7500 and Vite dev server on :5173
```

`make serve` starts only the backend. `make debug` and `make serve-now` pin the
clock to a fixed date for reproducible screenshots.

## Common targets

| Target | What it does |
| --- | --- |
| `make dev` / `make serve` | Run the full dev stack / backend only |
| `make build` | Build frontend assets and the backend binary |
| `make test` | Frontend and Go backend tests |
| `make test-all` | Adds integration and browser end-to-end tests |
| `make lint` | Biome, TypeScript, Svelte, and golangci-lint checks |
| `make format` | Format frontend and Go sources |
| `make generate` | Regenerate the Swagger spec and TypeScript API client |
| `make docs` | Serve these docs at `http://localhost:8000` |
| `make docs-check` | Strict docs build plus link, metadata, and search checks |
| `make clean` / `make distclean` | Remove build output / also `node_modules` |

See [Testing](testing.md) for the test layers and [API](api.md) for the
generated client.

## Documentation workflow

Install the pinned toolchain once, then use the Makefile:

```bash
pip install -r docs/requirements.txt
make docs          # live reload
make docs-check    # what CI runs on every pull request
```

Every page needs a `description:` in its front matter. `make docs-check`
fails if a page, link, asset, or search entry is broken, if a configuration key
from `backend/pkg/config/schema.json` is missing from the
[configuration reference](../reference/config.md), or if an internal page leaks
into search.

## Pull requests

Run `make lint` and `make test` before opening a pull request, and
`make docs-check` when you touch `docs/`, `mkdocs.yml`, or `CHANGELOG.md`. Add a
line to `CHANGELOG.md` for user-visible changes.
