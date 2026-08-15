<script lang="ts">
  import { renderHarvestables } from "$lib/charts/harvest";
  import { ajax } from "$lib/core/utils";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  onMount(async () => {
    const { harvestables: harvestables } = await ajax("/api/harvest");
    renderHarvestables(Object.values(harvestables));
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Tax Loss Harvesting"
    description="Identify tax-saving opportunities by offsetting capital gains with losses"
  />

  <Section>
    <div class="columns is-flex-wrap-wrap has-text-grey-dark" id="d3-harvestables"></div>
  </Section>
</Page>
