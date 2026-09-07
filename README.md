<p align="center"><img src="docs/images/logo.svg" alt="Paisa logo" width="96"></p>

# Paisa

A private, open-source personal finance manager built on plain-text double-entry accounting.

Bring expenses, investments, and financial plans together while keeping your journal in files you control. Paisa builds on [Ledger](https://www.ledger-cli.org/), with visual reports, reusable statement imports, and an integrated editor.

[Documentation](docs/index.md) · [Product Tour](docs/product-tour.md) · [Installation](docs/getting-started/installation.md) · [Releases](https://github.com/Pratap-kute/paisa/releases) · [Upstream demo](https://demo.paisa.fyi)

The documentation in this repository describes this checkout. The [upstream hosted documentation](https://paisa.fyi) and demo may show a different version; packaged releases may also differ.

![Paisa overview: dashboard, budgets, portfolio analysis, statement import, and journal editor using synthetic data](docs/images/showcase/paisa-overview.gif)

[View the static dashboard screenshot](docs/images/showcase/dashboard.png). The sample journal also demonstrates data-quality and budget warnings.

## What Paisa can do

| Your goal | What you can do |
| --- | --- |
| Track | Follow net worth, income, expenses, assets, investments, and liabilities. |
| Understand | Explore cash flow, spending categories, asset allocation, investment gains, and XIRR where sufficient data is available. |
| Plan | Set budgets and savings goals, explore retirement plans and what-if scenarios, and review recurring transactions and credit-card bills. |
| Import | Convert CSV, Excel, and PDF statements using reusable templates; review the generated Ledger journal before saving. |
| Own your data | Keep your journal and configuration in version-control-friendly files; run Paisa locally or on your own server. |

Explore the [Product Tour](docs/product-tour.md), including financial data checks with Doctor and interactive calculation sheets.

## Why Paisa?

- **A journal you own.** Plain-text accounting keeps your records readable outside Paisa and independent of a proprietary database format.
- **Double-entry foundations.** Accounts connect where money comes from, where it goes, and what you own or owe.
- **One financial picture.** Expense management and investment analysis share the same journal.
- **Repeatable imports.** Reuse statement templates and review transactions in an approachable editor.

Your journal stays with the Paisa instance you control. Configured market-price providers make external requests; self-hosting and third-party hosting have different privacy boundaries. Read the [manifesto](docs/manifesto.md) and [authentication guide](docs/reference/user-authentication.md).

## Quick Start

[Install the Desktop application or CLI](docs/getting-started/installation.md). With the CLI installed, start the local web interface:

```sh
paisa serve
```

Open [Paisa on localhost:7500](http://localhost:7500), then follow the [tutorial](docs/getting-started/tutorial.md) to create your first journal. The installation guide also covers Docker and Nix, with artifact sources identified explicitly.

## Community

[Report an issue](https://github.com/Pratap-kute/paisa/issues) in this repository or join the established [Paisa Matrix community](https://matrix.to/#/#paisa:matrix.org). See the [FAQ](docs/faq.md) for common questions.

## Project History & Credits

Paisa was originally created by **[Anantha Kumaran](https://github.com/ananthakumaran)** and has grown through the work of its contributors.

This repository continues that work with ongoing maintenance, improvements, and new features while preserving Paisa's original philosophy and open-source history.

See the [original project](https://github.com/ananthakumaran/paisa), [Git history](https://github.com/Pratap-kute/paisa/commits/master/), and [upstream](https://github.com/ananthakumaran/paisa/graphs/contributors) and [current repository contributors](https://github.com/Pratap-kute/paisa/graphs/contributors) for the contribution record.

## License

Paisa is licensed under the [GNU AGPL version 3 or later](COPYING).
