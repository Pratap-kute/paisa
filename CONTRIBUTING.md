# Contributing to Paisa

Thanks for helping. The full guide lives in the docs:

- [Contributor setup](https://pratap-kute.github.io/paisa/development/setup/): toolchain, Dev Container, Makefile targets
- [Testing](https://pratap-kute.github.io/paisa/development/testing/): Go, unit, component, browser, and visual suites
- [API](https://pratap-kute.github.io/paisa/development/api/): Swagger and the generated TypeScript client

## Quick start

```bash
cd frontend && bun install && cd ..
make build
make dev
```

## Before opening a pull request

- `make lint` and `make test` pass.
- `make docs-check` passes if you changed `docs/`, `mkdocs.yml`, or `CHANGELOG.md`.
- User-visible changes have an entry in `CHANGELOG.md`.
- New configuration keys are documented in `docs/reference/config.md`.

Use the [issue tracker](https://github.com/Pratap-kute/paisa/issues) for bugs,
feature requests, and documentation corrections.
