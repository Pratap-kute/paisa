<script lang="ts">
  import { rem } from "$lib/core/utils";
  import { onMount, onDestroy } from "svelte";
  import { TabulatorFull as Tabulator, type ColumnDefinition } from "tabulator-tables";

  export let data: any[] = [];
  export let columns: ColumnDefinition[];
  export let tree = false;

  let tableComponent: HTMLElement;
  let tabulator: Tabulator;
  let isBuilt = false;

  $: if (isBuilt && data && data.length > 0) {
    try {
      tabulator?.setData(data);
    } catch (_) {}
  }

  onMount(() => {
    if (!tableComponent) return;
    tabulator = new Tabulator(tableComponent, {
      dataTree: tree,
      dataTreeStartExpanded: [true, true, false],
      dataTreeBranchElement: false,
      dataTreeChildIndent: rem(30),
      dataTreeCollapseElement:
        "<span class='has-text-link icon is-small mr-3'><i class='fas fa-angle-up'></i></span>",
      dataTreeExpandElement:
        "<span class='has-text-link icon is-small mr-3'><i class='fas fa-angle-down'></i></span>",
      data: data || [],
      columns: columns,
      layout: "fitDataTable"
    });
    tabulator.on("tableBuilt", () => {
      isBuilt = true;
    });
  });

  onDestroy(() => {
    tabulator?.destroy();
  });
</script>

<div class="paisa-overflow-x-auto box py-0" style="max-width: 100%;" bind:this={tableComponent}></div>
