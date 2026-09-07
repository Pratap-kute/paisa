# Journal examples

These examples illustrate the same salary, rent, and investment entries using different currency conventions. See the [tutorial](tutorial.md), [journal reference](../reference/journal.md), and [commodity configuration](../reference/commodities.md) before adapting them.

=== ":material-currency-inr: INR"

    ```ledger
    2022/01/01 Salary
        Income:Salary:Acme     -100,000 INR
        Assets:Checking         100,000 INR

    2022/01/03 Rent
        Assets:Checking         -20,000 INR
        Expenses:Rent

    2022/01/07 Investment
        Assets:Checking         -20,000 INR
        Assets:Equity:NIFTY   168.690 NIFTY @ 118.56 INR
    ```

=== ":material-currency-usd: USD"

    ```ledger
    2022/01/01 Salary
        Income:Salary:Acme      $-5,000
        Assets:Checking          $5,000

    2022/01/03 Rent
        Assets:Checking         $-2,000
        Expenses:Rent

    2022/01/07 Investment
        Assets:Checking         $-1,000
        Assets:Equity:AAPL   6.452 AAPL @ $154.97
    ```

=== ":fontawesome-solid-euro-sign: EURO"

    ```ledger
    commodity €
        format €1.000,00

    commodity AAPL
        format 1.000,00 AAPL

    2022/01/01 Salary
        Income:Salary:Acme      €-5.000
        Assets:Checking          €5.000

    2022/01/03 Rent
        Assets:Checking         €-2.000
        Expenses:Rent

    2022/01/07 Investment
        Assets:Checking      €-1.000,02
        Assets:Equity:AAPL   6,453 AAPL @ €154,97
    ```

