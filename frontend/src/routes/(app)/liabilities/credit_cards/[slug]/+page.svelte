<script lang="ts">
  import { goto } from "$app/navigation";
  import COLORS from "$lib/core/colors";
  import CreditCardCard from "$lib/components/finance/CreditCardCard.svelte";
  import DueDate from "$lib/components/finance/DueDate.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import TransactionCard from "$lib/components/transactions/TransactionCard.svelte";
  import { renderYearlySpends } from "$lib/charts/credit_cards";
  import { iconify } from "$lib/core/icon";
  import {
    ajax,
    formatCurrency,
    formatPercentage,
    type CreditCardBill,
    type CreditCardSummary
  } from "$lib/core/utils";
  import MasonryGrid from "$lib/components/ui/MasonryGrid.svelte";
  import _, { now } from "lodash";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let svg: SVGElement = $state();

  let creditCard: CreditCardSummary = $state();
  let currentBill: CreditCardBill = $state();
  let found = false;
  let small = true;
  let rendered = $state(false);

  function lastBill(creditCard: CreditCardSummary): CreditCardBill {
    return _.find(_.reverse(_.clone(creditCard.bills)), (b) => {
      return b.statementEndDate.isSameOrBefore(now());
    });
  }

  $effect(() => {
    if (creditCard && svg && !rendered) {
      renderYearlySpends(svg, creditCard.yearlySpends);
      rendered = true;
    }
  });

  onMount(async () => {
    ({ creditCard, found } = await ajax("/api/credit_cards/:account", null, data));
    if (!found) {
      return goto("/liabilities/credit_cards");
    }

    currentBill = lastBill(creditCard);
  });
</script>

<Page width="fluid">
  <PageHeader
    title={creditCard?.account || "Credit Card Details"}
    description="Card utilization, statement history, and transaction details"
  />

  <div class="paisa-credit-card-detail-layout">
    <!-- Side Context Panel -->
    <div class="paisa-credit-card-side">
      {#if creditCard}
        <div class="mb-2">
          <CreditCardCard {creditCard} />
        </div>

        <Section title="Credit Summary">
          <MetricStrip cols={2}>
            <LevelItem
              narrow
              small
              title="Available Credit"
              color={COLORS.neutral}
              value={formatCurrency(Math.max(creditCard.creditLimit - creditCard.balance, 0))}
            />
            <LevelItem
              narrow
              small
              title="Credit Usage"
              color={COLORS.neutral}
              value={formatPercentage(creditCard.balance / creditCard.creditLimit, 2)}
            />
            <LevelItem
              narrow
              small
              title="Statements"
              color={COLORS.neutral}
              value={creditCard.bills.length.toString()}
            />
            <LevelItem
              narrow
              small
              title="Transactions"
              color={COLORS.neutral}
              value={_.sumBy(creditCard.bills, (b) => b.transactions.length).toString()}
            />
          </MetricStrip>
        </Section>

        <Section title="Year-wise Spends">
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
      {/if}
    </div>

    <!-- Main Content Panel -->
    <div class="paisa-credit-card-main">
      {#if currentBill}
        <Section>
          <div class="paisa-bill-header-bar">
            <div class="paisa-bill-due-meta">
              <span class="custom-icon is-size-5 paisa-nowrap">{iconify(creditCard.account)}</span>
              <div class="paisa-nowrap">
                <span class="mr-1 is-size-7 has-text-grey">Payment:</span>
                <span><DueDate dueDate={currentBill.dueDate} paidDate={currentBill.paidDate} /></span>
              </div>
            </div>

            <div class="select is-medium">
              <select bind:value={currentBill}>
                {#each _.reverse(_.clone(creditCard.bills)) as bill}
                  <option value={bill}
                    >{bill.statementStartDate.format("DD MMM YYYY")} — {bill.statementEndDate.format(
                      "DD MMM YYYY"
                    )}</option
                  >
                {/each}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Statement Summary">
          <div class="paisa-bill-calc-strip">
            <LevelItem
              {small}
              narrow
              title="Opening Balance"
              color={COLORS.neutral}
              value={formatCurrency(currentBill.openingBalance)}
            />
            <span class="icon is-size-4 has-text-grey"><i class="fas fa-plus"></i></span>
            <LevelItem
              {small}
              narrow
              title="Debits"
              color={COLORS.expenses}
              value={formatCurrency(currentBill.debits)}
            />
            <span class="icon is-size-4 has-text-grey"><i class="fas fa-minus"></i></span>
            <LevelItem
              {small}
              narrow
              title="Credits"
              color={COLORS.income}
              value={formatCurrency(currentBill.credits)}
            />
            <span class="icon is-size-4 has-text-grey"><i class="fas fa-equals"></i></span>
            <LevelItem
              {small}
              narrow
              title="Amount Due"
              color={COLORS.liabilities}
              value={formatCurrency(currentBill.closingBalance)}
            />
          </div>
        </Section>

        <Section title="Transactions">
          <MasonryGrid gap={10} maxStretchColumnSize={500} align="stretch">
            {#each currentBill.transactions as t}
              <div class="mr-3 is-flex-grow-1">
                <TransactionCard {t} />
              </div>
            {/each}
          </MasonryGrid>
        </Section>
      {/if}
    </div>
  </div>
</Page>

<style lang="scss">
  .paisa-credit-card-detail-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-5);
    width: 100%;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(280px, 1fr) minmax(0, 3fr);
    }
  }

  .paisa-credit-card-side,
  .paisa-credit-card-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }

  .paisa-bill-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-3);
    padding: var(--paisa-space-3) var(--paisa-space-4);
    background: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
  }

  .paisa-bill-due-meta {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
  }

  .paisa-bill-calc-strip {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    padding: var(--paisa-space-3) var(--paisa-space-4);
    background: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow-x: auto;
  }
</style>
