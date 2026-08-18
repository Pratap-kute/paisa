# ==============================================================================
# Paisa - Frontend SvelteKit Web Application
# Makefile for Paisa frontend development and deployment.
# ==============================================================================

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_ .-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1;34m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development & Server

.PHONY: dev preview
dev: ## Start Vite development server
	deno task dev

preview: ## Preview production build locally
	deno task preview

##@ Build

.PHONY: build watch clean
build: ## Build SvelteKit static site into backend/web/static
	deno task build

watch: ## Watch and rebuild frontend assets on change
	deno task build:watch

clean: ## Remove frontend build output, caches, and test artifacts
	deno task clean

##@ Testing

.PHONY: test test-all test-unit test-core test-component test-integration test-e2e test-visual test-visual-update test-coverage
test: test-unit test-core test-component ## Run frontend unit, core, and component tests

test-all: test-unit test-core test-component test-integration test-e2e ## Run full frontend test suite

test-unit: ## Run frontend unit tests
	deno task test:unit

test-core: ## Run domain core Vitest tests
	deno task test:core

test-component: ## Run Svelte component Vitest tests
	deno task test:component

test-integration: ## Run CLI integration tests
	unset PAISA_CONFIG && TZ=UTC deno task test:integration

test-e2e: ## Run Playwright browser tests
	deno task test:e2e

test-visual: ## Run Playwright visual snapshot tests
	deno task test:visual

test-visual-update: ## Update Playwright visual snapshot baselines
	deno task test:visual:update

test-coverage: ## Generate frontend test coverage report
	deno task test:coverage

##@ Code Quality & Security

.PHONY: lint check typecheck format fmt audit vulncheck
lint: ## Run Deno linter
	deno task lint

audit vulncheck: ## Run Deno dependency vulnerability audit
	deno task audit

check typecheck: ## Run TypeScript and Svelte template type checks
	deno task check

format fmt: ## Format frontend source files
	deno task format

##@ Code Generation & Tooling

.PHONY: parsers parser generate-fonts normalize-fixtures
parsers parser: ## Rebuild Lezer sheet and search query grammars
	deno task parser-build-debug

generate-fonts: ## Download SVGs and generate custom icon font
	deno run -A scripts/fonts/download-svgs.js
	deno run -A scripts/fonts/generate-font.js

normalize-fixtures: ## Strip generated ids from committed API fixture JSON baselines
	deno run -A scripts/normalize_fixture_json.ts
