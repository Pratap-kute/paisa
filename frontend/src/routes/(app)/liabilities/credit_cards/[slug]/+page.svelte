<script lang="ts">
  import { goto } from "$app/navigation";
  import DueDate from "$lib/features/liabilities/components/DueDate.svelte";
  import TransactionCard from "$lib/features/transactions/components/TransactionCard.svelte";
  import { buildCreditCardYearlySpendsComparison } from "$lib/charts/bar_comparison_data";
  import { iconify } from "$lib/shared/ui/icon";
  import {
    ajax,
    formatCurrency,
    formatPercentage,
    type CreditCardBill,
    type CreditCardSummary,
  } from "$lib/core/utils";
  import { clone } from "es-toolkit";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
  import Metric from "$lib/shared/layout/Metric.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import Select from "$lib/shared/ui/Select.svelte";
  import ComparisonBarChart from "$lib/features/charts/components/ComparisonBarChart.svelte";
import { findIndex, now, reverse } from "$lib/shared/utils/collection";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let creditCard: CreditCardSummary = $state();
  let found = false;
  let selectedBillIndex = $state(0);

  let billOptions = $derived(
    creditCard ? reverse(clone(creditCard.bills)) : [],
  );
  let currentBill = $derived(billOptions[selectedBillIndex]);
  let utilization = $derived(
    creditCard && creditCard.creditLimit > 0
      ? creditCard.balance / creditCard.creditLimit
      : 0,
  );
  let yearlySpendsData = $derived(
    creditCard ? buildCreditCardYearlySpendsComparison(creditCard.yearlySpends) : undefined,
  );

  function lastBillIndex(creditCard: CreditCardSummary): number {
    const bills = reverse(clone(creditCard.bills));
    const idx = findIndex(bills, (b) =>
      b.statementEndDate.isSameOrBefore(now()),
    );
    return idx >= 0 ? idx : 0;
  }

  function dueDateSecondary(bill: CreditCardBill): string {
    if (bill.closingBalance <= 0) return "No dues";
    if (bill.paidDate) return `Paid ${bill.paidDate.format("DD MMM YYYY")}`;
    return `Due ${bill.dueDate.fromNow()}`;
  }

  $effect(() => {
    if (billOptions.length > 0 && selectedBillIndex >= billOptions.length) {
      selectedBillIndex = 0;
    }
  });

  onMount(async () => {
    ({ creditCard, found } = await ajax(
      "/api/credit_cards/:account",
      null,
      data,
    ));
    if (!found) {
      return goto("/liabilities/credit_cards");
    }

    selectedBillIndex = lastBillIndex(creditCard);
  });
</script>

<svelte:head>
  <title>{creditCard?.account || "Credit Card"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title={creditCard?.account || "Credit Card Details"}
    description="Statement history, utilization, and transaction breakdown"
  >
    {#snippet leading()}
      <a
        href="/liabilities/credit_cards"
        class="inline-flex items-center gap-1 text-sm text-[var(--paisa-muted-foreground)] transition-colors hover:text-[var(--paisa-foreground)]"
      >
        <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
        <span>Credit Cards</span>
      </a>
    {/snippet}

    {#snippet actions()}
      {#if billOptions.length > 0}
        <Select bind:value={selectedBillIndex} size="md">
          {#each billOptions as bill, index}
            <option value={index}>
              {bill.statementStartDate.format("DD MMM YYYY")} — {bill.statementEndDate.format(
                "DD MMM YYYY",
              )}
            </option>
          {/each}
        </Select>
      {/if}
    {/snippet}
  </PageHeader>

  {#if creditCard && currentBill}
    <MetricStrip cols={3}>
      <Metric
        label="Amount Due"
        value={formatCurrency(currentBill.closingBalance)}
        status="primary"
      />
      <Metric
        label="Due Date"
        value={currentBill.dueDate.format("DD MMM YYYY")}
        secondary={dueDateSecondary(currentBill)}
      />
      <Metric
        label="Utilization"
        value={formatPercentage(utilization, 2)}
        secondary={`Limit ${formatCurrency(creditCard.creditLimit)}`}
        status={utilization > 0.8 ? "warning" : "neutral"}
      />
    </MetricStrip>

    <Section title="Statement Equation">
      <div
        class="flex items-center gap-3 overflow-x-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] px-4 py-3"
      >
        <Metric
          class="!border-0 !p-0"
          label="Opening Balance"
          value={formatCurrency(currentBill.openingBalance)}
        />
        <span
          class="shrink-0 text-lg text-[var(--paisa-muted-foreground)]"
          aria-hidden="true"
        >
          <i class="fas fa-plus"></i>
        </span>
        <Metric
          class="!border-0 !p-0"
          label="Purchases"
          value={formatCurrency(currentBill.debits)}
          status="negative"
        />
        <span
          class="shrink-0 text-lg text-[var(--paisa-muted-foreground)]"
          aria-hidden="true"
        >
          <i class="fas fa-minus"></i>
        </span>
        <Metric
          class="!border-0 !p-0"
          label="Credits"
          value={formatCurrency(currentBill.credits)}
          status="positive"
        />
        <span
          class="shrink-0 text-lg text-[var(--paisa-muted-foreground)]"
          aria-hidden="true"
        >
          <i class="fas fa-equals"></i>
        </span>
        <Metric
          class="!border-0 !p-0"
          label="Amount Due"
          value={formatCurrency(currentBill.closingBalance)}
          status="primary"
        />
      </div>

      <div
        class="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--paisa-muted-foreground)]"
      >
        <span class="custom-icon text-base">{iconify(creditCard.account)}</span>
        <span class="inline-flex items-center gap-1">
          <span>Payment:</span>
          <DueDate
            dueDate={currentBill.dueDate}
            paidDate={currentBill.paidDate}
            amountDue={currentBill.closingBalance}
          />
        </span>
      </div>
    </Section>

    <Section title="Spending Trend">
      <ChartFrame height="compact" rows={Math.max(3, yearlySpendsData?.points.length ?? 3)}>
        {#if yearlySpendsData}
          <ComparisonBarChart
            data={yearlySpendsData}
            ariaLabel="Credit card yearly spending"
            testId="credit-card-yearly-spends-echart"
          />
        {/if}
      </ChartFrame>
    </Section>

    <Section
      title="Transactions in Statement"
      subtitle="{currentBill.transactions.length} transaction(s)"
    >
      <div class="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {#each currentBill.transactions as t}
          <TransactionCard {t} />
        {/each}
      </div>
    </Section>
  {/if}
</Page>
