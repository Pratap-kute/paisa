<script lang="ts">
  import { api } from "$lib/api";
  import CreditCardCard from "$lib/features/liabilities/components/CreditCardCard.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
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
    ({ creditCards } = await api.creditCards.getCreditCards() as unknown as {
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
    <ZeroState item={!isEmpty}>
      <p class="text-sm text-[var(--paisa-muted-foreground)]">
        <strong class="text-[var(--paisa-foreground)]">Oops!</strong> You haven't configured any credit cards yet. Checkout the
        <a href={helpUrl("credit-card")} class="text-[var(--paisa-primary)] underline">docs</a> page to get started.
      </p>
    </ZeroState>

    {#if !isEmpty}
      <div class="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(19rem,25rem))]">
        {#each creditCards as creditCard}
          <CreditCardCard {creditCard} />
        {/each}
      </div>
    {/if}
  </Section>
</Page>
