---
hide:
  - toc
title: Paisa – Open-Source Personal Finance Manager
description: Self-hosted personal finance for Ledger, hledger, and Beancount with budgets, investments, imports, goals, and financial insights.
---

<div class="hero" markdown>
![Paisa logo](images/logo.svg)
# Paisa
<p class="subtitle">Personal finance, grounded in a journal you own.</p>
</div>

Paisa is an open-source personal finance manager built on Ledger double-entry
accounting. It brings spending, investments, liabilities, and plans into one
place while keeping your records in plain-text files.

[Install Paisa](getting-started/installation.md){ .md-button .md-button--primary }
[Take the Product Tour](product-tour.md){ .md-button }
[View on GitHub](https://github.com/Pratap-kute/paisa){ .md-button }

![Paisa dashboard showing balances, cash flow, and recent activity](images/showcase/dashboard.png)

## Your data stays understandable

A Ledger journal records both sides of every transaction. It remains readable,
portable, and easy to back up even when Paisa is not running. Paisa builds its
reports from that journal and stores derived data in a local SQLite database.

You can run Paisa on your own computer or a server you control. Configured price
providers make requests to external services, and any third-party host can
access the data stored there.

## What can I do with Paisa?

<div class="grid cards" markdown>

-   :material-chart-box-outline: **Understand your finances**

    ---

    Review expenses, income, net worth, cash flow, liabilities, investment performance, and allocation.

-   :material-map-marker-path: **Plan ahead**

    ---

    Set budgets and goals, review recurring commitments, and explore retirement or what-if scenarios.

-   :material-file-import-outline: **Bring in your records**

    ---

    Import CSV, Excel, and PDF statements, reuse templates, and review the generated entries before saving.

-   :material-stethoscope: **Find problems early**

    ---

    Use Doctor to find accounting, valuation, allocation, and reconciliation issues in your data.

</div>

## Get started

1. [Install Paisa](getting-started/installation.md).
2. Follow [First setup](getting-started/tutorial.md) to create a working journal.
3. Explore the [Product Tour](product-tour.md) or jump to [Using Paisa](using-paisa/index.md).

!!! note "Which version do these docs describe?"

    This site follows the maintained
    [`Pratap-kute/paisa`](https://github.com/Pratap-kute/paisa) repository.
    A packaged release can lag behind the documentation. Upstream resources are
    listed separately in [Project history and community](project/index.md).

## Project history

Paisa was originally created by **[Anantha Kumaran](https://github.com/ananthakumaran)**
and developed with contributions from the open-source community. This repository
continues that work while preserving its history and AGPL license.

[Read the project history](project/index.md) · [Read the manifesto](manifesto.md)
