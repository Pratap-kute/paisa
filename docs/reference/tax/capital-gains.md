---
description: "See financial-year capital gains tax with buy/sell matching in Paisa."
---

# Capital Gains

Mutual Funds are considered as capital asset and capital gains tax will be
charged on any gains. Capital Gains page shows the financial year wise capital
gains tax based on the withdrawal transaction. The sum total, account wise
breakdown, and per buy/sell match information are available.

Only commodities with `tax_category` are considered. Please check
[Tax Harvesting](tax-harvesting.md) page for configuration details.

### Gain

The difference between the purchase and sell price.

### Taxable Gain

The gain after applying Indexation or Grandfathering provision.

Based on the duration between the purchase and sell date, an asset might be
classified as Short Term or Long Term.

### Short Term Tax

This would be a percentage of the Taxable Gain. The percentage varies based on
the asset class.

### Long Term Tax

This would be a percentage of the Taxable Gain. The percentage varies based on
the asset class.

### Taxable at Slab Rate

There are cases where the gain would be added to taxable income and charged
**Slab** rate. Since the tax rate would depend on the person, the whole taxable
amount is shown instead of the tax. You can multiply this with your slab rate to
get the tax amount.

## How tax is calculated

Paisa gives an estimate. Check it against your own records, and with a tax
adviser, before filing.

- **Matching:** sales are matched to purchases first-in, first-out (FIFO).
- **Listed equity** (`equity`, `equity65`):
  - Held for more than a year is long term. Gains on sales before 1 Apr 2018 were
    exempt.
  - Units bought before 1 Feb 2018 are grandfathered: the cost is the higher of
    your actual cost and the lower of the 31 Jan 2018 price and the sale price,
    so the rule never creates a loss or makes a loss bigger. Without a price for
    31 Jan 2018 the actual cost is used.
  - The rates follow the **sale date**: 15% short term and 10% long term up to
    22 Jul 2024, and 20% and 12.5% from 23 Jul 2024.
- **Debt funds** (`debt`): units bought before 1 Apr 2023 and held for more than
  3 years get indexation and 20% long term tax. Units bought on or after 1 Apr
  2023 get no indexation and the whole gain is **Taxable at Slab Rate**.
- **Yearly totals:** the totals for a financial year add up all accounts, so a
  loss in one account offsets a gain in another. A year with a net loss owes no
  tax, so its Short Term and Long Term tax are shown as 0 while the Taxable Gain
  stays negative.

### Not modelled

Rates for `equity35` and `unlisted_equity` do not change with the sale date.
Debt units bought before 1 Apr 2023 are still taxed under the earlier rules
(indexation, 20%) even when sold after 23 Jul 2024, when the rules for them
changed. Check these cases yourself.

The annual long term exemption (₹1.25 lakh from 23 Jul 2024), carrying a loss
forward to later years, set-off of short term losses against long term gains,
surcharge and cess, and the 2025 changes to the definition of specified mutual
funds.

