# ==============================================================================
# Paisa - Desktop Application (Wails)
# ==============================================================================

SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help
help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z0-9_ .-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1;34m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development & Build

.PHONY: develop build dmg clean
develop: ## Start Wails development mode
	wails dev -tags webkit2_41

build: ## Build desktop application
	wails build -tags webkit2_41

dmg: ## Build macOS DMG installer
	rm -rf Paisa.dmg
	wails build
	create-dmg --volname "Paisa" --window-pos 200 120 --window-size 800 400 --icon-size 100  --icon "Paisa.app" 200 190 --app-drop-link 600 185 --hide-extension "Paisa.app" --volicon build/bin/Paisa.app/Contents/Resources/iconfile.icns  "Paisa.dmg" build/bin/Paisa.app

clean: ## Remove desktop build outputs
	rm -rf build/bin frontend/dist Paisa.dmg

##@ Security & Code Quality

.PHONY: audit vulncheck
audit vulncheck: ## Run govulncheck vulnerability scanner for desktop
	govulncheck ./...
