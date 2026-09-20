---
description: "Documentation on how to search and edit transactions in bulk in Paisa, an open source personal finance manager"
---

# Bulk edit

Bulk edit finds a set of transactions and applies one reviewed change to all of
them. The page has two parts:

1. Search narrows the transaction list.

2. The edit form previews and applies the change.

## Search

### Plain searches

Enter an account name, date, amount, or regular expression directly.

```query
Expenses:Utilities:Electricity
```

This finds transactions containing a posting under
`Expenses:Utilities:Electricity`. Searches are case-insensitive substring
matches by default, so `#!query Expenses:Utilities` also matches that account.
Put account names containing spaces in double quotes, for example
`#!query "Expenses:Utilities:Hair Cut"`.

You can also search by date. `#!query [2023-01-01]` matches one day,
`#!query [2023-01]` matches a month, and `#!query [2023]` matches a year.

There is experimental support for natural language date. You can do queries like
`#!query [last month]`, `#!query [last year]`, `#!query [this month]`,
`#!query [last
week]`, `#!query [jan 2023]`, etc.

To search by amount, enter a value such as `#!query 42`. Paisa finds
transactions containing a posting with that amount.

To match one exact account, use a regular expression such as
`#!query /^Assets:Equity:APPLE$/`. Add the `i` modifier for a case-insensitive
match: `#!query /^Assets:Equity:APPLE$/i`.

### Property searches {#property}

You can also search based on properties like account, commodity, amount, total,
filename, note, payee and date.

```query
payee =~ /uber/i
payee = "Advance Tax"
commodity = GOLD
total > 5000
note = "rebate"
account = "Expenses:Utilities:Electricity"
date >= [2023-01-01]
filename = creditcard/2023/jan.ledger
```

The general format is `property operator value`. The property can be any of the
following:

- **account** - posting account
- **commodity** - posting commodity
- **amount** - posting amount
- **total** - transaction total
- **filename** - name of the file the transaction is in
- **note** - posting or transaction note (comment)
- **payee** - transaction payee
- **date** - transaction date

The operator can be any of the following:

- **=** equal
- **=~** regular expression match
- **<** less than
- **<=** less than or equal
- **\>** greater than
- **\>=** greater than or equal

Some property, operator, and value combinations do not make sense. If a query
is invalid, the UI shows an error before you apply it.

When you omit the property and operator, Paisa chooses them from the value you
entered. For example,
`#!query 42` will be treated as `#!query amount = 42`,
`#!query Expenses:Utilities` will be treated as
`#!query account = Expenses:Utilities`, `#!query /Expenses:Utilities/i` will be
treated as `#!query account =~ /Expenses:Utilities/i`, `#!query [2023-01]` will
be treated as `#!query date = [2023-01]`.

### Combined searches

Combine property searches with `AND` or `OR`, and negate a condition with
`NOT`:

```query
account = Expenses:Utilities AND payee =~ /uber/i
commodity = GOLD OR total > 5000
date >= [2023-01-01] AND date < [2023-04-01]
account = Expenses:Utilities AND payee =~ /uber/i AND (total > 5000 OR total < 1000)
[last year] AND (payee =~ /swiggy/i OR payee =~ /phonepe/i)
total < 5000 AND NOT account = Expenses:Utilities
```

If you leave out the conditional operator, Paisa uses `AND`. These queries are
equivalent:

```query
account = Expenses:Utilities payee =~ /uber/i
account = Expenses:Utilities AND payee =~ /uber/i
```

## Edit and review

Bulk edit currently supports renaming accounts. Use **Preview** to inspect the
side-by-side diff before saving.
