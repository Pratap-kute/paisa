<script lang="ts">
  import { renderHarvestables } from "$lib/charts/harvest";
  import { ajax } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);

  onMount(async () => {
    try {
      const { harvestables: harvestables } = await ajax("/api/harvest");
      const values = Object.values(harvestables);
      if (_.isEmpty(values) || !_.some(values, (h) => h.harvestable_units > 0)) {
        isEmpty = true;
        return;
      }

      isLoading = false;
      await tick();
      renderHarvestables(values);
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
      preserveChildren
    >
      <div
        id="d3-harvestables"
        class="flex w-full flex-wrap text-[var(--paisa-muted-foreground)]"
      ></div>
    </ChartFrame>
  </Section>
</Page>
