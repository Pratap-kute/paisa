# What-if Scenario Planning

Open **Wealth → Scenarios** to test financial changes without modifying your ledger. Scenarios are temporary: leaving or reloading the page discards them. Evaluation creates no postings and changes no config, budgets, goals, prices, or database records.

## Baseline methodology

Paisa captures today's balances in its configured timezone. Checking cash uses `Assets:Checking` and colon-delimited descendants. Investments use the Investment Performance universe: assets excluding checking. Investment valuation and contributions reuse the same accounting, dividend, split, and internal-transfer handling as Investment Performance. Missing prices retain its valuation fallback and are disclosed as estimates.

Current net worth uses the existing valuation path. The difference between net worth and cash plus investments is held constant. This static component can be negative because it includes liabilities; it is never clamped.

Monthly operational income excludes capital gains, dividends, and interest. Monthly expenses include all `Expenses:*`, including taxes. Investment transfers use actual net external contributions, excluding reinvested dividends and internal investment transfers. Forecast and future postings are excluded.

Each recurring assumption is the median of the most recent six completed historical months. One to five available months produce a partial baseline with a sample count. Observed zero months count; months before a series has history are not invented. With zero samples, the assumption is unavailable. A negative income or expense median caused by reversals is unavailable rather than converted to an absolute value.

A comparison requires known starting cash and all three recurring baseline assumptions. Manual values can be entered and retained, but never fabricate a missing baseline. There is no scenario-only result. Zero investment holdings are valid when the required recurring assumptions are available.

## Normalized money and returns

Income and expenses are nonnegative magnitudes. A positive monthly investment transfer moves cash to investments; a negative transfer moves investments to cash. One-time event amounts are positive, with direction determined by event type.

The shared expected annual return defaults to **0%**. Both projections use it unless you explicitly enable a different scenario return. Historical XIRR and period returns are never reused as forecast assumptions. The API takes ratios (`0.08` means 8%); the UI takes percentages. Negative returns greater than −100% are supported.

## Projection timing

Projection starts on the first day of next calendar month using today's balances. The remainder of the current month is omitted. Horizons are 1, 3, 5, or 10 years in the UI; the API accepts 1–120 months.

Every month uses this exact sequence:

1. Grow opening investments by `(1 + annualReturn)^(1/12) - 1`.
2. Add recurring income.
3. Subtract recurring expenses.
4. Apply external cash inflows and expenses.
5. Apply the signed recurring investment transfer.
6. Apply one-time cash/investment transfers in their listed order.
7. Record closing cash, investments, and net worth.

Contributions occur at month end and earn no same-month return. Financial balances use decimal arithmetic without monthly display rounding. Projection net worth always equals cash plus investments plus the fixed static component.

Negative cash is retained and reported. Minimum cash includes the opening balance, and an already-negative opening balance is disclosed separately. Withdrawals above available investments produce a validation error rather than a clamped balance.

## Example: increasing investments

With monthly income of ₹1.5L, expenses of ₹80K, and investments of ₹40K, monthly cash increases by ₹30K. Increasing the investment transfer to ₹60K reduces monthly cash accumulation to ₹10K.

At zero return, the extra ₹20K invested reduces cash by exactly ₹20K and increases investments by exactly ₹20K. It creates no wealth. Any later net-worth difference under a shared nonzero return comes from investment growth.

Likewise, redeeming ₹50K with ₹1L cash and ₹2L investments produces ₹1.5L cash and ₹1.5L investments: net worth remains ₹3L. Recurring negative transfers preserve the same identity.

## Limitations

This is an illustrative deterministic projection based on selected assumptions, not a prediction or investment advice. Other assets and liabilities remain constant. V1 does not simulate taxes on projected transactions, inflation, debt amortization, goals, retirement, probabilities, market predictions, saved scenarios, AI calculations, or recommendations.
