<script lang="ts">
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { buildLegends, renderOverview } from "$lib/charts/gain";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let legends: Legend[] = $state([]);

  onMount(async () => {
    const { gain_breakdown: gains } = await ajax("/api/gain");

    legends = buildLegends();
    renderOverview(gains);
  });
</script>

<Page width="analysis">
  <Section title="Gain Overview">
    <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="category">
      <svg id="d3-gain-overview" />
    </ChartFrame>
  </Section>

  <Section>
    <div class="d3-gain-timeline-breakdown">
      <div id="d3-gain-timeline-breakdown"></div>
    </div>
  </Section>
</Page>
