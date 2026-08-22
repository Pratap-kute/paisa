<script lang="ts">
  import { goto } from "$app/navigation";
  import DueDate from "$lib/components/finance/DueDate.svelte";
  import TransactionCard from "$lib/components/transactions/TransactionCard.svelte";
  import { renderYearlySpends } from "$lib/charts/credit_cards";
  import { iconify } from "$lib/core/icon";
  import {
    ajax,
    formatCurrency,
    formatPercentage,
    type CreditCardBill,
    type CreditCardSummary,
  } from "$lib/core/utils";
  import _, { now } from "lodash";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import Select from "$lib/components/ui/Select.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let svg: SVGElement = $state();

  let creditCard: CreditCardSummary = $state();
  let found = false;
  let rendered = $state(false);
  let selectedBillIndex = $state(0);

  let billOptions = $derived(
    creditCard ? _.reverse(_.clone(creditCard.bills)) : [],
  );
  let currentBill = $derived(billOptions[selectedBillIndex]);
  let utilization = $derived(
    creditCard && creditCard.creditLimit > 0
      ? creditCard.balance / creditCard.creditLimit
      : 0,
  );

  function lastBillIndex(creditCard: CreditCardSummary): number {
    const bills = _.reverse(_.clone(creditCard.bills));
    const idx = _.findIndex(bills, (b) =>
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
    if (creditCard && svg && !rendered) {
      renderYearlySpends(svg, creditCard.yearlySpends);
      rendered = true;
    }
  });

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
      <ChartFrame
        type="category"
        onresize={() => {
          if (svg && creditCard) {
            svg.replaceChildren();
            renderYearlySpends(svg, creditCard.yearlySpends);
          }
        }}
      >
        <svg bind:this={svg} width="100%" />
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
