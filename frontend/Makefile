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
	bun run dev

preview: ## Preview production build locally
	bun run preview

##@ Build

.PHONY: build watch clean
build: ## Build SvelteKit static site into backend/web/static
	bun run build

watch: ## Watch and rebuild frontend assets on change
	bun run build:watch

clean: ## Remove frontend build output, caches, and test artifacts
	bun run clean

##@ Testing

.PHONY: test test-all test-unit test-core test-component test-integration test-e2e test-visual test-visual-update test-coverage
test: test-unit test-core test-component ## Run frontend unit, core, and component tests

test-all: test-unit test-core test-component test-integration test-e2e ## Run full frontend test suite

test-unit: ## Run frontend unit tests
	bun run test:unit

test-core: ## Run domain core Vitest tests
	bun run test:core

test-component: ## Run Svelte component Vitest tests
	bun run test:component

test-integration: ## Run CLI integration tests
	unset PAISA_CONFIG && TZ=UTC bun run test:integration

test-e2e: ## Run Playwright browser tests
	bun run test:e2e

test-visual: ## Run Playwright visual snapshot tests
	bun run test:visual

test-visual-update: ## Update Playwright visual snapshot baselines
	bun run test:visual:update

test-coverage: ## Generate frontend test coverage report
	bun run test:coverage

##@ Code Quality & Security

.PHONY: lint check typecheck format fmt audit vulncheck govulncheck govulnerability govulnabrity
lint: ## Run Biome linter
	bun run lint

audit vulncheck govulncheck govulnerability govulnabrity: ## Run Bun dependency vulnerability audit
	bun run audit

check typecheck: ## Run TypeScript and Svelte template type checks
	bun run check

format fmt: ## Format frontend source files
	bun run format

##@ Code Generation & Tooling

.PHONY: parsers parser generate-fonts normalize-fixtures
parsers parser: ## Rebuild Lezer sheet and search query grammars
	bun run parser-build-debug

generate-fonts: ## Download SVGs and generate custom icon font
	bun run scripts/fonts/download-svgs.js
	bun run scripts/fonts/generate-font.js

normalize-fixtures: ## Strip generated ids from committed API fixture JSON baselines
	bun run scripts/normalize_fixture_json.ts

api: ## Generate TypeScript API client and data contracts from Swagger specification
	bun run api:generate

