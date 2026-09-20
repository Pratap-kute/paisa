---
description: Answers to common questions about setting up and using Paisa.
---

# Frequently asked questions

## I already use Ledger, hledger, or Beancount. How do I start? {#existing-user-getting-started}

[Install Paisa](getting-started/installation.md), then open
[Configuration](reference/config.md) and set your journal path, accounting CLI,
default currency, locale, and time zone. Once the journal loads, read
[Accounts](reference/accounts.md) for the account conventions used by Paisa's
reports.

## Do I need to enter my full financial history? {#getting-started}

No. Start at the level of detail that is useful to you. An opening balance,
monthly income, major expenses, and investment contributions can already show a
useful picture. Add more detail later or use [statement import](reference/import.md)
when you are comfortable with the journal.

## Where does Paisa store my data?

Desktop and CLI installations use `Documents/paisa` by default. Your journal
and configuration are plain-text files. Paisa also maintains a SQLite database
for reports; it can rebuild much of that data from the journal, but you should
still back up the whole directory.

## Does Paisa connect to my bank?

No. Statement import works with files that you provide, and Paisa does not
initiate payments. Configured market-price providers can make external requests
for prices.

## Why does the macOS app report that an executable is missing? {#exec-not-found}

Apps launched from Finder often receive a smaller `PATH` than Terminal. Paisa
checks these common locations before reporting an error:

```text
/bin
/usr/bin
/usr/local/bin
/sbin
/usr/sbin
/opt/homebrew/bin
```

If your configured accounting CLI is elsewhere, update its path in
[Configuration](reference/config.md) or create a symlink in one of those
directories.

## Where should I report a problem?

Open an issue in the
[`Pratap-kute/paisa` issue tracker](https://github.com/Pratap-kute/paisa/issues).
Include the Paisa version, operating system, accounting CLI, and the relevant
error message. Remove personal financial data before attaching files or logs.
