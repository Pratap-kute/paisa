<script lang="ts">
import Card from "$lib/shared/ui/Card.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";
import type { InvestmentYearlyCard as InvestmentYearlyCardType } from "$lib/domain/assets";
import { formatCurrency, formatFloat } from "$lib/shared/formatters/currency";

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

const rows = $derived([
  {
    label: "Gross Salary Income",
    value: formatCurrency(card.gross_salary_income),
  },
  {
    label: "Gross Other Income",
    value: formatCurrency(card.gross_other_income),
  },
  { label: "Tax", value: formatCurrency(card.net_tax) },
  { label: "Net Income", value: formatCurrency(card.net_income) },
  { label: "Net Expense", value: formatCurrency(card.net_expense) },
  {
    label: "Investment",
    value: formatCurrency(card.net_investment),
    highlight: true,
  },
  { label: "Savings Rate", value: `${formatFloat(card.savings_rate)}%` },
]);
</script>

<Card padding="sm">
  {#snippet header()}
    <div class="flex items-center justify-between gap-[var(--paisa-space-2)]">
      <span class="text-base font-semibold text-[var(--paisa-foreground)]">{financialYear}</span>
      <Badge variant={savingsVariant} size="sm" dot>
        {formatFloat(card.savings_rate)}%
      </Badge>
    </div>
  {/snippet}

  <div class="w-full overflow-x-auto">
    <table class="mb-0 w-full border-collapse text-xs">
      <tbody>
        {#each rows as row}
          <tr class="border-b border-[var(--paisa-border-subtle)] last:border-b-0">
            <td class="whitespace-nowrap px-2 py-1 text-[var(--paisa-muted-foreground)]">
              {row.label}
            </td>
            <td
              class="whitespace-nowrap px-2 py-1 text-right font-semibold tabular-nums {row.highlight
                ? 'text-[var(--paisa-primary)]'
                : ''}"
            >
              {row.value}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</Card>
