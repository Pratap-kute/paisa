# ==============================================================================
# Paisa - Personal Finance Manager
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
	@if [ ! -f web/static/index.html ]; then deno task build; fi
	deno task develop

debug: ## Start frontend and backend with fixed date for debugging
	@if [ ! -f web/static/index.html ]; then deno task build; fi
	deno task debug

serve: ## Start the backend HTTP server only
	deno task serve

serve-now: ## Start backend server with fixed current date
	deno task serve:now

watch: ## Watch and rebuild frontend assets on change
	deno task build:watch

sample: ## Initialize and update demo sample data
	go build -o paisa . && ./paisa init && ./paisa update

# ------------------------------------------------------------------------------
# Build & Installation
# ------------------------------------------------------------------------------

##@ Build & Installation

.PHONY: build build-frontend build-backend build-windows install clean jsbuild windows
build: build-frontend build-backend ## Build both frontend assets and backend binary

build-frontend jsbuild: ## Build Svelte/Vite frontend static assets
	deno task build

build-backend: ## Build the Go backend binary
	go build -o paisa .

build-windows windows: ## Cross-compile Go binary for Windows (amd64)
	GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CXX=x86_64-w64-mingw32-g++ CC=x86_64-w64-mingw32-gcc go build -o paisa.exe .

install: ## Build frontend, backend and install binary to GOBIN
	deno task build
	go build -o paisa .
	go install

clean: ## Clean build artifacts, static files, and temporary databases
	deno task clean
	rm -rf test-results playwright-report /tmp/ledger_bin /tmp/paisa-*

# ------------------------------------------------------------------------------
# Testing
# ------------------------------------------------------------------------------

##@ Testing

.PHONY: test test-all test-unit test-go test-integration test-e2e test-visual test-visual-update test-coverage jstest
test: test-unit test-go ## Run frontend unit tests and Go backend test suite

test-all: test-unit test-go test-integration test-e2e ## Run entire test suite (unit, Go, integration, E2E)

test-unit: ## Run frontend unit tests
	deno task test:unit

test-go: ## Run all Go backend unit and regression tests
	go test -count=1 ./...

test-integration jstest: build-frontend build-backend ## Run ledger CLI integration tests
	unset PAISA_CONFIG && TZ=UTC deno task test:integration

test-e2e: ## Run Playwright end-to-end browser tests
	deno task test:e2e

test-visual: ## Run Playwright visual snapshot regression tests
	deno task test:visual

test-visual-update: ## Update Playwright visual snapshot baselines
	deno task test:visual:update

test-coverage: ## Generate frontend test coverage report
	deno task test:coverage

# ------------------------------------------------------------------------------
# Code Quality & Formatting
# ------------------------------------------------------------------------------

##@ Code Quality

.PHONY: quality lint lint-go go-lint lint-frontend check typecheck format fmt
quality: lint test-go ## Run full code quality pipeline (linters, typecheck, tests)

lint: lint-frontend typecheck lint-go ## Run all linters (Deno, TypeScript, GolangCI)

lint-go go-lint: ## Run golangci-lint for Go backend
	golangci-lint run

lint-frontend: ## Run Deno linter for frontend code
	deno task lint

check typecheck: ## Run TypeScript and Svelte template type checks
	deno task check

format fmt: ## Format frontend and Go source files
	deno task format
	gofmt -s -w .

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

.PHONY: parsers parser generate-fonts node2nix regen regen-fixtures
parsers parser: ## Rebuild Lezer sheet and search query grammars
	deno task parser-build-debug

generate-fonts: ## Download SVGs and generate custom icon font
	deno run -A scripts/fonts/download-svgs.js
	node scripts/fonts/generate-font.js

node2nix: ## Re-generate Nix package expressions from package.json
	npm install --lockfile-version 2
	node2nix --development -18 --input package.json \
		--lock package-lock.json \
		--node-env ./flake/node-env.nix \
		--composition ./flake/default.nix \
		--output ./flake/node-package.nix

regen regen-fixtures: build-backend ## Re-generate integration test JSON fixtures
	unset PAISA_CONFIG && REGENERATE=true TZ=UTC deno task test:integration

fixture/main.transactions.json:
	cd /tmp && paisa init
	cp fixture/main.ledger /tmp/main.ledger
	cd /tmp && paisa update --journal && paisa serve -p 6500 &
	sleep 1
	curl http://localhost:6500/api/transaction | jq .transactions > fixture/main.transactions.json
	pkill -f 'paisa serve -p 6500'
