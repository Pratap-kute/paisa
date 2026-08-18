<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import {
    formatCurrency,
    formatFloat,
    type InvestmentYearlyCard as InvestmentYearlyCardType
  } from "$lib/core/utils";

  interface Props {
    card: InvestmentYearlyCardType;
  }

  let { card }: Props = $props();

  let financialYear = $derived(
    `${card.start_date.format("YYYY")} - ${card.end_date.format("YY")}`
  );

  let savingsVariant = $derived<"success" | "primary" | "warning" | "danger">(
    card.savings_rate >= 50
      ? "success"
      : card.savings_rate >= 20
        ? "primary"
        : card.savings_rate > 0
          ? "warning"
          : "danger"
  );
</script>

<Card padding="sm">
  {#snippet header()}
    <div class="is-flex is-justify-content-between is-align-items-center">
      <span class="has-text-weight-bold is-size-6">{financialYear}</span>
      <Badge variant={savingsVariant} size="sm" dot>
        {formatFloat(card.savings_rate)}%
      </Badge>
    </div>
  {/snippet}

  <div class="paisa-yearly-table-wrap">
    <table class="table is-narrow is-fullwidth is-size-7 is-hoverable mb-0">
      <tbody>
        <tr>
          <td>Gross Salary Income</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(card.gross_salary_income)}</td>
        </tr>
        <tr>
          <td>Gross Other Income</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(card.gross_other_income)}</td>
        </tr>
        <tr>
          <td>Tax</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(card.net_tax)}</td>
        </tr>
        <tr>
          <td>Net Income</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(card.net_income)}</td>
        </tr>
        <tr>
          <td>Net Expense</td>
          <td class="has-text-right has-text-weight-bold">{formatCurrency(card.net_expense)}</td>
        </tr>
        <tr>
          <td>Investment</td>
          <td class="has-text-right has-text-weight-bold has-text-primary">{formatCurrency(card.net_investment)}</td>
        </tr>
        <tr>
          <td>Savings Rate</td>
          <td class="has-text-right has-text-weight-bold">{formatFloat(card.savings_rate)}%</td>
        </tr>
      </tbody>
    </table>
  </div>
</Card>

<style lang="scss">
  .paisa-yearly-table-wrap {
    table {
      background: transparent;

      td {
        padding: var(--paisa-space-1) var(--paisa-space-2);
        border-color: var(--paisa-border-subtle);
      }
    }
  }
</style>
