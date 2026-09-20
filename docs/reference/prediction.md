---
description: "Understand account suggestions during statement imports."
---

# Account suggestions

When you import a statement, Paisa can suggest an account for each transaction.
Suggestions help with the first pass; you review them in the preview before
anything is added to the journal.

## How a suggestion is made

Paisa checks these sources in order:

1. A saved merchant rule, when one matches.
2. Similar descriptions and account choices from your ledger history.
3. A local text model for less familiar descriptions.
4. `Unknown` when there is not enough evidence.

The result includes a confidence level and a reason where available. Low-
confidence and unknown suggestions should be reviewed or replaced before you
save the import.

## Merchant rules

If a merchant always belongs to the same account, save a merchant rule from the
import workflow or configuration. Rules are stored under
`prediction.merchant_rules` in `paisa.yaml` and take precedence over general
history. Read-only configurations cannot save new rules.

Reviewing or overriding a suggestion fixes the current import. A saved merchant
rule is the option that persists for future imports; Paisa does not silently
change your journal categories.

Prediction runs locally on the data available to Paisa. It does not send your
statement to an external AI service.
