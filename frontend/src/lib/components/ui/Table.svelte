<script lang="ts">
  import { rem } from "$lib/core/utils";
  import { onMount, onDestroy } from "svelte";
  import { TabulatorFull as Tabulator, type ColumnDefinition, type Options } from "tabulator-tables";

  interface Props {
    data?: any[];
    columns: ColumnDefinition[];
    tree?: boolean;
    class?: string;
    options?: Partial<Options>;
  }

  let {
    data = [],
    columns,
    tree = false,
    class: className = "",
    options = {},
  }: Props = $props();

  let tableComponent: HTMLElement = $state();
  let tabulator: Tabulator = $state();
  let isBuilt = $state(false);

  let processedColumns = $derived(
    (columns || []).map((col) => {
      const colDef = { ...col };
      if (colDef.hozAlign && !colDef.headerHozAlign) {
        colDef.headerHozAlign = colDef.hozAlign;
      }
      return colDef;
    })
  );

  $effect(() => {
    if (isBuilt) {
      try {
        tabulator?.setData(data ?? []);
      } catch (_) {}
    }
  });

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
      columns: processedColumns,
      layout: "fitColumns",
      ...options,
    });
    tabulator.on("tableBuilt", () => {
      isBuilt = true;
    });
  });

  onDestroy(() => {
    tabulator?.destroy();
  });
</script>

<div class="paisa-overflow-x-auto box py-0 {className}" style="max-width: 100%;" bind:this={tableComponent}></div>
