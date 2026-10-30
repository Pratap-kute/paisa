#!/usr/bin/env bash
set -euo pipefail

# Ensure GOPATH directory exists
mkdir -p "${GOPATH:-$HOME/go}"

# Install frontend dependencies
cd frontend
deno install

# Install Playwright Chromium browser
deno task playwright install chromium

# Pre-sync SvelteKit types
deno run -A npm:@sveltejs/kit sync

echo "Paisa Dev Container environment ready!"
