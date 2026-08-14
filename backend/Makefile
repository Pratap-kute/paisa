# ==============================================================================
# Paisa - Backend Service & CLI
# ==============================================================================

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_ .-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1;34m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Build & Installation

.PHONY: build build-windows install clean
build: ## Build the Go backend binary
	go build -o paisa .

build-windows: ## Cross-compile Go binary for Windows (amd64)
	GOOS=windows GOARCH=amd64 CGO_ENABLED=1 CXX=x86_64-w64-mingw32-g++ CC=x86_64-w64-mingw32-gcc go build -o paisa.exe .

install: ## Install binary to GOBIN
	go install

clean: ## Clean built backend binary
	rm -f paisa paisa.exe

##@ Testing & Code Quality

.PHONY: test lint format fmt
test: ## Run all Go unit and regression tests
	go test -count=1 ./...

lint: ## Run golangci-lint
	golangci-lint run

format fmt: ## Format Go source code
	gofmt -s -w .
