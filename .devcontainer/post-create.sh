#!/usr/bin/env bash
set -euo pipefail

# Ensure GOPATH directory exists
mkdir -p "${GOPATH:-$HOME/go}"

# Install frontend dependencies
cd frontend
bun install

# Install Playwright Chromium browser
bun run playwright install chromium

# Pre-sync SvelteKit types
bun run svelte-kit sync

echo "Paisa Dev Container environment ready!"
