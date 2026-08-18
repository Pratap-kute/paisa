<script lang="ts">
  import CreditCardCard from "$lib/components/finance/CreditCardCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import { ajax, helpUrl, type CreditCardSummary } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";

  let isEmpty = $state(false);
  let creditCards: CreditCardSummary[] = $state([]);

  onMount(async () => {
    ({ creditCards } = await ajax("/api/credit_cards"));
    if (_.isEmpty(creditCards)) {
      isEmpty = true;
    }
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Credit Cards"
    description="Credit card balances, utilization, and billing statements"
  />

  <Section>
    <ZeroState item={!isEmpty}>
      <strong>Oops!</strong> You haven't configured any credit cards yet. Checkout the
      <a href={helpUrl("credit-card")}>docs</a> page to get started.
    </ZeroState>

    <ResponsiveGrid variant="cards">
      {#each creditCards as creditCard}
        <CreditCardCard {creditCard} />
      {/each}
    </ResponsiveGrid>
  </Section>
</Page>
