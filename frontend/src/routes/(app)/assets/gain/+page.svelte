<script lang="ts">
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { buildLegends, renderOverview } from "$lib/charts/gain";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";

  let legends: Legend[] = $state([]);

  onMount(async () => {
    const { gain_breakdown: gains } = await ajax("/api/gain");

    legends = buildLegends();
    renderOverview(gains);
  });
</script>

<section class="section tab-gain">
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-12">
        <div class="box paisa-overflow-x-auto">
          <LegendCard {legends} clazz="ml-4" />
          <svg id="d3-gain-overview" />
        </div>
      </div>
    </div>
    <BoxLabel text="Gain Overview" />
  </div>
</section>
<section class="section tab-gain">
  <div class="container is-fluid d3-gain-timeline-breakdown">
    <div class="columns">
      <div id="d3-gain-timeline-breakdown" class="column is-12"></div>
    </div>
  </div>
</section>
