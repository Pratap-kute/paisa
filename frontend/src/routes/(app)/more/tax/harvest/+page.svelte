<script lang="ts">
  import { renderHarvestables } from "$lib/charts/harvest";
  import { ajax } from "$lib/core/utils";
  import { onMount } from "svelte";

  onMount(async () => {
    const { harvestables: harvestables } = await ajax("/api/harvest");
    renderHarvestables(Object.values(harvestables));
  });
</script>

<section class="section tab-harvest">
  <div class="container is-fluid">
    <div class="columns is-flex-wrap-wrap has-text-grey-dark" id="d3-harvestables" />
  </div>
</section>
