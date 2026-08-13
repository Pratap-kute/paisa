# Packaging

This directory contains non-default release and distribution definitions:

- `docker/` contains the demo and optional ledger-backend image variants.
- `ledger/` contains the pinned Nix and Homebrew recipes used to bundle Ledger.

The root `Dockerfile` remains at the repository root so standard Docker commands
continue to work without an explicit file path. Release automation references
the variant files here explicitly.
