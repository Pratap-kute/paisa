<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import {
    formatCurrency,
    formatFloat,
    type InvestmentYearlyCard as InvestmentYearlyCardType,
  } from "$lib/core/utils";

  interface Props {
    card: InvestmentYearlyCardType;
  }

  let { card }: Props = $props();

  let financialYear = $derived(
    `${card.start_date.format("YYYY")} - ${card.end_date.format("YY")}`,
  );

  let savingsVariant = $derived<"success" | "primary" | "warning" | "danger">(
    card.savings_rate >= 50
      ? "success"
      : card.savings_rate >= 20
        ? "primary"
        : card.savings_rate > 0
          ? "warning"
          : "danger",
  );
</script>

<Card padding="sm">
  {#snippet header()}
    <div class="paisa-yearly-card-header">
      <span class="paisa-yearly-card-title">{financialYear}</span>
      <Badge variant={savingsVariant} size="sm" dot>
        {formatFloat(card.savings_rate)}%
      </Badge>
    </div>
  {/snippet}

  <div class="paisa-yearly-table-wrap">
    <table class="table is-narrow is-fullwidth is-size-7 is-hoverable mb-0 paisa-yearly-table">
      <tbody>
        <tr>
          <td>Gross Salary Income</td>
          <td class="has-text-right paisa-tabular-nums">{formatCurrency(card.gross_salary_income)}</td>
        </tr>
        <tr>
          <td>Gross Other Income</td>
          <td class="has-text-right paisa-tabular-nums">{formatCurrency(card.gross_other_income)}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td class="has-text-right paisa-tabular-nums">{formatCurrency(card.net_tax)}</td>
        </tr>
        <tr>
          <td>Net Income</td>
          <td class="has-text-right paisa-tabular-nums">{formatCurrency(card.net_income)}</td>
        </tr>
        <tr>
          <td>Net Expense</td>
          <td class="has-text-right paisa-tabular-nums">{formatCurrency(card.net_expense)}</td>
        </tr>
        <tr>
          <td>Investment</td>
          <td class="has-text-right paisa-tabular-nums text-[var(--paisa-primary)]">
            {formatCurrency(card.net_investment)}
          </td>
        </tr>
        <tr>
          <td>Savings Rate</td>
          <td class="has-text-right paisa-tabular-nums">{formatFloat(card.savings_rate)}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>

<style lang="scss">
  .paisa-yearly-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
  }

  .paisa-yearly-card-title {
    font-size: var(--paisa-font-size-base);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-foreground);
  }

  .paisa-yearly-table-wrap {
    .paisa-yearly-table {
      background: transparent;

      td {
        padding: var(--paisa-space-1) var(--paisa-space-2);
        border-color: var(--paisa-border-subtle);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      td:first-child {
        color: var(--paisa-muted-foreground);
      }

      td:last-child {
        font-weight: var(--paisa-font-weight-semibold);
      }
    }
  }
</style>
