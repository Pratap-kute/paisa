<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import { MasonryGrid as EgjsMasonryGrid } from "@egjs/grid";

  export let gap: number = 0;
  export let maxStretchColumnSize: number = Infinity;
  export let align: "justify" | "stretch" | "start" | "center" | "end" = "justify";
  export let defaultDirection: "end" | "start" = "end";

  let container: HTMLDivElement;
  let grid: EgjsMasonryGrid | null = null;
  let observer: MutationObserver | null = null;

  onMount(() => {
    grid = new EgjsMasonryGrid(container, {
      gap,
      maxStretchColumnSize,
      align,
      defaultDirection,
      useResizeObserver: true,
      autoResize: true
    });
    grid.renderItems();

    if (typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        grid?.syncElements();
      });
      observer.observe(container, { childList: true, subtree: false });
    }
  });

  afterUpdate(() => {
    grid?.syncElements();
  });

  onDestroy(() => {
    observer?.disconnect();
    grid?.destroy();
    grid = null;
  });
</script>

<div bind:this={container} class="masonry-grid-container">
  <slot />
</div>
