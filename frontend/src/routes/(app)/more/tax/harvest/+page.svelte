<script lang="ts">
  import { filterHarvestables } from "$lib/charts/harvest_data";
  import { ajax, type Harvestable } from "$lib/core/utils";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import HarvestCard from "$lib/components/tax/HarvestCard.svelte";

  let isLoading = $state(true);
  let harvestables: Harvestable[] = $state([]);
  const isEmpty = $derived(!isLoading && harvestables.length === 0);

  onMount(async () => {
    try {
      const response = await ajax("/api/harvest");
      harvestables = filterHarvestables(Object.values(response.harvestables));
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Tax Loss Harvesting - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Tax Loss Harvesting"
    description="Identify tax-saving opportunities by offsetting capital gains with losses"
  />

  <Section>
    <ChartFrame
      type="dynamic"
      loading={isLoading}
      empty={!isLoading && isEmpty}
      emptyMessage="No harvestable tax-loss opportunities found"
    >
      <div class="flex w-full flex-col gap-3" data-testid="harvestables">
        {#each harvestables as harvestable (harvestable.account)}
          <HarvestCard {harvestable} />
        {/each}
      </div>
    </ChartFrame>
  </Section>
</Page>
