<script lang="ts">
  import { rem } from "$lib/core/utils";
  import { onMount, onDestroy } from "svelte";
  import { TabulatorFull as Tabulator, type ColumnDefinition, type Options } from "tabulator-tables";

  interface Props {
    data?: any[];
    columns: ColumnDefinition[];
    tree?: boolean;
    treeStartExpanded?: Options["dataTreeStartExpanded"];
    class?: string;
    options?: Partial<Options>;
  }

  let {
    data = [],
    columns,
    tree = false,
    treeStartExpanded = [true, true, false],
    class: className = "",
    options = {},
  }: Props = $props();

  let tableComponent: HTMLElement = $state();
  let tabulator: Tabulator = $state();
  let isBuilt = $state(false);
  let renderedData: any[] | undefined;

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
    if (isBuilt && data !== renderedData) {
      renderedData = data;
      try {
        tabulator?.setData(data ?? []);
      } catch (_) {}
    }
  });

  onMount(() => {
    if (!tableComponent) return;
    renderedData = data;
    tabulator = new Tabulator(tableComponent, {
      dataTree: tree,
      dataTreeStartExpanded: treeStartExpanded,
      dataTreeBranchElement: false,
      dataTreeChildIndent: rem(30),
      dataTreeCollapseElement:
        "<span class='paisa-tabulator-tree-toggle mr-3'><i class='fas fa-angle-up'></i></span>",
      dataTreeExpandElement:
        "<span class='paisa-tabulator-tree-toggle mr-3'><i class='fas fa-angle-down'></i></span>",
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

<div class="paisa-overflow-x-auto paisa-table-host py-0 {className}" style="max-width: 100%;" bind:this={tableComponent}></div>
