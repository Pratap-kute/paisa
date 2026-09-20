---
description: "How to configure credit cards in Paisa"
---

# Credit Cards

Add each card under `credit_cards` and connect it to the liability account you
already use in your journal. Paisa can then show the balance, statement period,
payment due date, credit limit, and utilization.

```yaml
credit_cards:
  - account: Liabilities:CreditCard:Freedom #(1)!
    credit_limit: 150000 #(2)!
    statement_end_day: 8 #(3)!
    due_day: 20 #(4)!
    network: visa #(5)!
    number: "0007" #(6)!
    expiration_date: "2029-05-01" #(7)!
```

1. Account name
2. Credit limit of the card
3. The day of the month when the statement is generated
4. The day of the month when the payment is due
5. The network of the card
6. The last 4 digits of the card number
7. The expiration date of the card

You can add this from `More > Configuration`. Expand **Credit Cards** and click
:fontawesome-solid-circle-plus: to add a card.

Once configured, the card appears under `Liabilities > Credit Cards`. Paisa
calculates the amount due, payment date, limit used, and related balance from
your journal.
