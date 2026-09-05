---
description: "How to configure recurring transactions in Paisa"
---

# Recurring

Some of the transactions recur on a regular interval and it might be useful to
know the next due date for such transactions. Recurring page shows the upcoming
or recently missed transactions.

Paisa depends on the posting metadata to identify which transactions are
recurring. This metadata can be added in couple of ways. Let's say you pay rent
every month and you want to mark it as recurring, a typical journal would like
below

```ledger
2023/07/01 Rent
    Expenses:Rent             15,000 INR
    Assets:Checking

2023/08/01 Rent
    Expenses:Rent             15,000 INR
    Assets:Checking
```

You can manually tag a posting by adding `; Recurring: Rent`.

```ledger
2023/07/01 Rent
    ; Recurring: Rent
    Expenses:Rent             15,000 INR
    Assets:Checking

2023/08/01 Rent
    ; Recurring: Rent
    Expenses:Rent             15,000 INR
    Assets:Checking
```

The first part of the metadata before the colon is called tag name. It should be
`Recurring`. The second part is the tag value. This value is used to group
transactions.

Tagging each and every posting can be tiresome. Ledger has a feature called
[Automated Transaction](https://ledger-cli.org/doc/ledger3.html#Automated-Transactions)
which can make this process simpler.

```ledger
= Expenses:Rent
    ; Recurring: Rent
```

The first line is the predicate and the line below it will get added to any
matching posting. By default, it will match the posting account name. But you
can target other attributes like payee, amount etc. You can find more examples
below, more info about predicate is available on Ledger
[docs](https://ledger-cli.org/doc/ledger3.html#Complex-expressions)

```ledger
= expr payee=~/^PPF$/
    ; Recurring: PPF

= expr payee=~/Mutual Fund/
    ; Recurring: Mutual Fund

= expr 'account=~/Expenses:Insurance/ and (payee=~/HDFC/)'
    ; Recurring: Life Insurance

= expr 'account=~/Expenses:Insurance/ and !(payee=~/HDFC/)'
    ; Recurring: Bike Insurance

= expr payee=~/Savings Interest/
    ; Recurring: Savings Interest
```

!!! tip

    Include the automated transactions at the top of the main ledger
    file. Ledger will apply the rules only to transactions that
    follow the automated transactions.

## Period

Paisa will try to infer the recurring period of the transactions automatically,
but this might not be perfect. Recurring period can also be explicitly specified
via metadata.

```ledger
= expr payee=~/Savings Interest/
    ; Recurring: Savings Interest
    ; Period: L MAR,JUN,SEP,DEC ?
```

Let's say your bank deposits the interest on the last day of the last month of
the quarter, we can specify like the example above. Paisa editor recognizes
**period syntax** and shows the upcoming 3 schedules right next to period
metadata.

```
┌─────────── day of the month 1-31
│  ┌─────────── month 1-12 or JAN-DEC
│  │  ┌─────────── day of the week 0-6 (Sunday to Saturday)
│  │  │
1  *  ?
```

The syntax of the period is similar to
[cron](https://en.wikipedia.org/wiki/Cron), with the omission of seconds and
hours.

| Field        | Allowed values      | Special characters |
| ------------ | ------------------- | ------------------ |
| Day of month | `1–31`              | `* , - ? L W`      |
| Month        | `1-12` or `JAN-DEC` | `* , -`            |
| Day of week  | `0-6` or `SUN-SAT`  | `* , - ? L`        |

`*` also known as wildcard represents all valid values. `?` means you want to
omit the field, usually you use it on the day of month or day of week. `L` means
last day of the month or week. `,` can be used to specify multiple entries. `-`
can be used to specify range. `W` means the closest business day to given day of
month

Multiple cron expressions can be specified by joining them using `|`. Refer the
[wikipedia](https://en.wikipedia.org/wiki/Cron) for more information. If you are
not sure, just type it out and the editor will show you whether it is valid and
the next 3 schedules if valid.

### Examples

- Last day of every month `#!ledger ; Period: L * ?`
- 5<sup>th</sup> every month `#!ledger ; Period: 5 * ?`
- Every Sunday `#!ledger ; Period: ? * 0`
- 1<sup>st</sup> of Jan and 7<sup>th</sup> of Feb
  `#!ledger ; Period: 1 JAN ? | 7 FEB ?`
- Closest business day to the 15<sup>th</sup> day of every month.
  `#!ledger ; Period: 15W * ?`

!!! warning

    Recurring page will only display a transaction as recurring if there
    is more than **one transaction** with the same tag name. If you
    have only one transaction, wait untill the next transaction is added
    to see it on the recurring page.

## Suggested recurring patterns

The recurring page also reviews untagged history for deterministic patterns.
Suggestions require at least three occurrences with compatible merchant,
account, direction, and commodity context. Calendar-based matching tolerates
small posting delays and month-end dates. Suggestions never affect confirmed
expense totals.

**Confirm recurring** adds `Recurring` metadata (or Beancount `recurring`
metadata) to the displayed historical transactions. Paisa preserves the
remaining source text, validates the edited files, creates its usual backups,
saves, and synchronizes. If a file changed while being reviewed, reload before
confirming. Confirmation across several files reports partial saves explicitly
if a later file fails; successfully saved tags remain in the ledger.

Continue applying the same recurring tag to future transactions, manually or
with an existing ledger automation rule. Confirmation does not create an
automatic merchant rule or change transaction categories.

**Not recurring** hides the suggestion for the current page visit. Reloading or
reopening the page may show it again; durable rejection rules are not stored.

## Recurring intelligence

Confirmed patterns show historical and typical amounts, expected date windows,
amount changes, and conservative late or possibly-stopped indicators. An
explicit `Period` remains authoritative. A manually tagged transaction remains
confirmed even when there is not enough evidence to predict its next occurrence.

Monthly and annual estimates include confirmed expenses only. Income, transfers,
investments, unconfirmed suggestions, and possibly-stopped sequences do not
inflate these commitments. Commodities are reported separately. Uncertain timing
is excluded from annualized estimates and identified in the summary.

The dashboard uses the same recurring analysis for its concise summary. The
recurring page retains the existing calendar and scheduled-history view in an
expandable section.
