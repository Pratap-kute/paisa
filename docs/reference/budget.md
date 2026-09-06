---
description: "How to setup envelope budgeting in Paisa, an open source personal finance manager"
---

# Budget

Paisa supports a simple budgeting system. Let's say you get 50000 INR at the
beginning of the month. You want to budget this amount and figure out how much
you can spend on each category.

Let's add a salary transaction to the ledger:

```ledger
2023/08/01 Salary
    Income:Salary:Acme         -50,000 INR
    Assets:Checking
```

Now you have 50k in your checking account. Let's budget this amount:

```ledger
~ Monthly in 2023/08/01
    Expenses:Rent               15,000 INR
    Expenses:Food               10,000 INR
    Expenses:Clothing            5,000 INR
    Expenses:Entertainment       5,000 INR
    Expenses:Transport           5,000 INR
    Expenses:Personal            5,000 INR
    Assets:Checking
```

The `~` character indicates that this is a periodic transaction. This is not a
real transaction, but used only for forecasting purposes. You can read more
about
[periodic expressions](https://ledger-cli.org/doc/ledger3.html#Period-Expressions)
and
[periodic transactions](https://ledger-cli.org/doc/ledger3.html#Budgeting-and-Forecasting).

!!! bug

    Even though the interval part is optional as per the doc, there is a
    [bug](https://github.com/ledger/ledger/issues/1625) in the ledger-cli, so you can't use `~ in 2023/08/01`,
    instead you always have to specify some interval like `~ Monthly in 2023/08/01`.

![Initial Budget](../images/budget-1.png)

Now you can see that you will have 5k left in your checking account at the end
of the month, if you spend as per your budget. Before you spend, you can check
your budget and verify if you have money available under that category.

Let's add some real transactions.

```ledger
2023/08/02 Rent
    Expenses:Rent               15,000 INR
    Assets:Checking

2023/08/03 Transport
    Expenses:Transport           1,000 INR
    Assets:Checking

2023/08/03 Food
    Expenses:Food                8,500 INR
    Assets:Checking

2023/08/05 Transport
    Expenses:Transport           2,000 INR
    Assets:Checking

2023/08/07 Transport
    Expenses:Transport           3,000 INR
    Assets:Checking

2023/08/10 Personal
    Expenses:Personal            4,000 INR
    Assets:Checking

2023/08/15 Insurance
    Expenses:Insurance           10000 INR
    Assets:Checking
```

![Month end Budget](../images/budget-2.png)

As the month progresses, you can see how much you have spent and how much you
have left. You notice that you have overspent on transport and you have missed
the insurance payment. You have a budget deficit now. That means, you can't
actually spend as per your budget. You have to first bring the deficit back
to 0. Let's cut down the entertainment and clothing budget to 0

```ledger hl_lines="4-5"
~ Monthly in 2023/08/01
    Expenses:Rent              15,000 INR
    Expenses:Food              10,000 INR
    Expenses:Clothing               0 INR
    Expenses:Entertainment          0 INR
    Expenses:Transport          5,000 INR
    Expenses:Personal           5,000 INR
    Assets:Checking
```

![Budget Deficit Fixed](../images/budget-3.png)

You can go back and adjust your budget anytime. Let's move on to the next month,
assuming you haven't made any further transaction.

```ledger
2023/09/01 Salary
    Income:Salary:Acme        -50,000 INR
    Assets:Checking

~ Monthly in 2023/09/01
    Expenses:Rent              15,000 INR
    Expenses:Food              10,000 INR
    Expenses:Clothing           5,000 INR
    Expenses:Entertainment      5,000 INR
    Expenses:Transport          5,000 INR
    Expenses:Personal           5,000 INR
    Assets:Checking
```

![Next month Budget](../images/budget-4.png)

You can see a new element in the UI called Rollover[^1]. This is basically the
amount you have budgeted last month, but haven't spent. This will automatically
rollover to the next month. That's pretty much it.

To recap, there are just two things you need to do.

1. Create a periodic transaction at the beginning of the month when you get your
   salary.

2. Adjust your budget as you spend and make sure there is no deficit.

## Budget Forecasting & Early-Warning System

For the active current month, Paisa augments reactive envelope tracking with an **early-warning forecasting system**. While your planned envelope (`Budget`) defines your intended allocation, Paisa computes a deterministic `Projected Spend` for each category before month-end.

### Deterministic Projection Algorithm

Paisa uses a strictly deterministic 4-tier fallback model without machine learning or statistical opacity:

1. **Historical Timing (Primary)**:
   If at least 3 completed historical months contain spending in this category, Paisa calculates the median fraction of monthly spending historically incurred by today's calendar day ($ProgressShare = \frac{SpentDay_{1..T}}{SpentTotal}$). If $ProgressShare \ge 5\%$, month-end spend is projected as:
   $$\text{Projected Spend} = \frac{\text{Observed Spend through Today}}{ProgressShare}$$
   This pattern-aware model naturally handles front-loaded expenses (such as rent or subscription fees paid on Day 2) without falsely alerting that spending will balloon $15\times$.

2. **Historical Median (Fallback)**:
   If historical timing has $< 5\%$ progress share (e.g. typical spending occurs later in the month), Paisa falls back to the median full-month total across available historical months.

3. **Calendar Pace (Linear Fallback)**:
   When insufficient historical months exist ($< 3$ samples), but at least 3 calendar days have elapsed in the current month ($T \ge 3$), Paisa projects spending linearly based on the month's elapsed days:
   $$\text{Projected Spend} = \text{Observed Spend through Today} \times \frac{\text{Days in Month}}{\text{Elapsed Days}}$$

4. **Insufficient Data**:
   During the first 2 calendar days of a month without historical data, Paisa marks the category as `insufficient-data` rather than making wild linear extrapolations.

### Future-Dated Postings and Rollover Semantics

* **Observed vs Future Spend**: Paisa separates spending observed through today from future-dated postings already entered for later in the month. The month-end projection is strictly bounded below by actual recorded spend: $\max(\text{actual}, \text{pacingProjection})$.
* **Effective Budget with Rollover**: Categories with positive rollover benefit from expanded capacity. Health thresholds compare projected spend against:
  $$\text{Effective Budget} = \text{Planned Budget} + \max(\text{Rollover}, 0)$$
  Deficit rollovers ($\text{Rollover} < 0$) are preserved as factual deficits.

### Health Statuses

| Status | Condition | Meaning |
| :--- | :--- | :--- |
| **Overspent** | $\text{Actual} > \text{Effective Budget}$ | Category is already overspent today. |
| **Likely Over** | $\text{Projected} > 1.05 \times \text{Effective Budget}$ | Spending pace is projected to exceed budget by $> 5\%$. |
| **At Risk** | $\text{Projected} \ge 0.95 \times \text{Effective Budget}$ | Spending pace is within $5\%$ of the budget threshold. |
| **On Track** | $\text{Projected} < 0.95 \times \text{Effective Budget}$ | Spending is safely within the allocated envelope. |
| **Insufficient Data** | Early in month with $< 3$ days & $< 3$ historical months | Pending further spending data. |

Budget forecasting applies exclusively to the active current month. Historical months present factual ledger actuals, while future months display planned budget envelopes.

[^1]: If you prefer to not have rollover feature, it can be disabled in the
    [configuration](../reference/config.md) page.
