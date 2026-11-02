<script lang="ts">
  import { api } from "$lib/api";
  import CreditCardCard from "$lib/features/liabilities/components/CreditCardCard.svelte";
  import EmptyState from "$lib/shared/ui/EmptyState.svelte";
  import { helpUrl } from "$lib/shared/browser/navigation";
  import type { CreditCardSummary } from "$lib/domain/liabilities";
  import { onMount } from "svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import { isEmpty as isEmptyValue } from "$lib/shared/utils/collection";

  let isEmpty = $state(false);
  let creditCards: CreditCardSummary[] = $state([]);

  onMount(async () => {
    ({ creditCards } = (await api.creditCards.getCreditCards()) as unknown as {
      creditCards: CreditCardSummary[];
    });
    if (isEmptyValue(creditCards)) {
      isEmpty = true;
    }
  });
</script>

<svelte:head>
  <title>Credit Cards - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Credit Cards"
    description="Credit card balances, utilization, and billing statements"
  />

  <Section>
    <EmptyState
      item={!isEmpty}
      icon="fa-credit-card"
      title="No credit cards configured"
      description="Add a credit card account to track statements and utilization."
    >
      {#snippet actions()}
        <a href={helpUrl("credit-card")} class="text-primary underline"
          >Read the guide</a
        >
      {/snippet}
    </EmptyState>

    {#if !isEmpty}
      <div
        class="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(19rem,25rem))]"
      >
        {#each creditCards as creditCard}
          <CreditCardCard {creditCard} />
        {/each}
      </div>
    {/if}
  </Section>
</Page>
