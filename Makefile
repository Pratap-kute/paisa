# ==============================================================================
# Paisa - Monorepo Orchestration
# ==============================================================================

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

##@ Help

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_ .-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1;34m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

# ------------------------------------------------------------------------------
# Development & Server
# ------------------------------------------------------------------------------

##@ Development & Server

.PHONY: dev develop debug serve serve-now watch
dev develop: ## Start frontend and backend in development mode
	@if [ ! -f backend/web/static/index.html ]; then $(MAKE) build-frontend; fi
	deno run --allow-env --allow-read --allow-run --allow-write --allow-net=0.0.0.0:7500,0.0.0.0:5173 scripts/dev.ts --frontend

debug: ## Start frontend and backend with fixed date for debugging
	@if [ ! -f backend/web/static/index.html ]; then $(MAKE) build-frontend; fi
	deno run --allow-env --allow-read --allow-run --allow-write --allow-net=0.0.0.0:7500,0.0.0.0:5173 scripts/dev.ts --frontend --now

serve: ## Start the backend HTTP server only
	deno run --allow-env --allow-read --allow-run --allow-write --allow-net=0.0.0.0:7500 scripts/dev.ts

serve-now: ## Start backend server with fixed current date
	deno run --allow-env --allow-read --allow-run --allow-write --allow-net=0.0.0.0:7500 scripts/dev.ts --now

watch: ## Watch and rebuild frontend assets on change
	$(MAKE) -C frontend watch

sample: build ## Initialize and update demo sample data
	./backend/paisa init && ./backend/paisa update

# ------------------------------------------------------------------------------
# Build & Installation
# ------------------------------------------------------------------------------

##@ Build & Installation

.PHONY: build build-frontend build-backend build-windows install clean distclean jsbuild windows
build: build-frontend build-backend ## Build both frontend assets and backend binary

build-frontend jsbuild: ## Build SvelteKit static assets into backend/web/static
	$(MAKE) -C frontend build

build-backend: ## Build the Go backend binary
	$(MAKE) -C backend build

build-windows windows: ## Cross-compile Go binary for Windows (amd64)
	$(MAKE) -C backend build-windows

install: build-frontend ## Build frontend and install backend binary to GOBIN
	$(MAKE) -C backend install

clean: ## Remove build artifacts, caches, and test outputs (preserves user data and dependencies)
	$(MAKE) -C frontend clean
	$(MAKE) -C backend clean
	$(MAKE) -C desktop clean
	rm -rf coverage graphify-out site build package test-results playwright-report
	rm -f paisa paisa.exe
	rm -f frontend/vite.config.js.timestamp-* frontend/vite.config.ts.timestamp-*
	@shopt -s nullglob; rm -rf /tmp/ledger_bin /tmp/paisa-*

distclean: clean ## Remove everything clean removes, plus node_modules directories
	rm -rf frontend/node_modules node_modules desktop/node_modules

# ------------------------------------------------------------------------------
# Testing
# ------------------------------------------------------------------------------

##@ Testing

.PHONY: test test-all test-frontend test-backend test-unit test-core test-component test-go test-integration test-e2e test-visual test-visual-update test-coverage jstest
test: test-frontend test-backend ## Run frontend tests and Go backend test suite

test-all: test-frontend test-backend test-integration test-e2e ## Run entire test suite (unit, Go, integration, E2E)

test-frontend: ## Run frontend test suite
	$(MAKE) -C frontend test

test-backend test-go: ## Run all Go backend unit and regression tests
	$(MAKE) -C backend test

test-unit: ## Run frontend unit tests
	$(MAKE) -C frontend test-unit

test-core: ## Run domain core Vitest tests
	$(MAKE) -C frontend test-core

test-component: ## Run Svelte component Vitest tests
	$(MAKE) -C frontend test-component

test-integration jstest: build ## Run ledger CLI integration tests
	$(MAKE) -C frontend test-integration

test-e2e: ## Run Playwright end-to-end browser tests
	$(MAKE) -C frontend test-e2e

test-visual: ## Run Playwright visual snapshot regression tests
	$(MAKE) -C frontend test-visual

test-visual-update: ## Update Playwright visual snapshot baselines
	$(MAKE) -C frontend test-visual-update

test-coverage: ## Generate frontend test coverage report
	$(MAKE) -C frontend test-coverage

# ------------------------------------------------------------------------------
# Code Quality & Security
# ------------------------------------------------------------------------------

##@ Code Quality & Security

.PHONY: quality lint lint-go go-lint lint-backend lint-frontend check typecheck audit audit-all audit-frontend audit-backend audit-desktop vulncheck vulncheck-all vulncheck-frontend vulncheck-backend vulncheck-desktop vulncheck-go format fmt
quality: lint test-backend ## Run full code quality pipeline (linters, typecheck, tests)

lint: lint-frontend typecheck lint-backend ## Run all linters (Deno, TypeScript, GolangCI)

lint-backend lint-go go-lint: ## Run golangci-lint for Go backend
	$(MAKE) -C backend lint

lint-frontend: ## Run Deno linter for frontend code
	$(MAKE) -C frontend lint

check typecheck: ## Run TypeScript and Svelte template type checks
	$(MAKE) -C frontend check

audit vulncheck audit-all vulncheck-all: audit-frontend audit-backend audit-desktop ## Run vulnerability checks across frontend, backend, and desktop

audit-frontend vulncheck-frontend: ## Run vulnerability audit for frontend (deno audit)
	$(MAKE) -C frontend audit

audit-backend vulncheck-backend vulncheck-go: ## Run vulnerability check for backend (govulncheck)
	$(MAKE) -C backend audit

audit-desktop vulncheck-desktop: ## Run vulnerability check for desktop (govulncheck)
	$(MAKE) -C desktop audit

format fmt: ## Format frontend and Go source files
	$(MAKE) -C frontend format
	$(MAKE) -C backend format

# ------------------------------------------------------------------------------
# Documentation
# ------------------------------------------------------------------------------

##@ Documentation

.PHONY: docs docs-build publish
docs: ## Serve documentation locally with live-reload (port 8000)
	mkdocs serve -a 0.0.0.0:8000

docs-build publish: ## Build static documentation site with MkDocs
	mkdocs build

# ------------------------------------------------------------------------------
# Code Generation & Tooling
# ------------------------------------------------------------------------------

##@ Code Generation & Tooling

.PHONY: parsers parser generate-fonts regen regen-fixtures
parsers parser: ## Rebuild Lezer sheet and search query grammars
	$(MAKE) -C frontend parsers

generate-fonts: ## Download SVGs and generate custom icon font
	$(MAKE) -C frontend generate-fonts

regen regen-fixtures: build ## Re-generate integration test JSON fixtures
	unset PAISA_CONFIG && REGENERATE=true TZ=UTC $(MAKE) -C frontend test-integration

fixture/main.transactions.json: build
	cd /tmp && ../backend/paisa init
	cp fixture/main.ledger /tmp/main.ledger
	cd /tmp && ../backend/paisa update --journal && ../backend/paisa serve -p 6500 &
	sleep 1
	curl http://localhost:6500/api/transaction | jq .transactions > fixture/main.transactions.json
	pkill -f 'paisa serve -p 6500'
