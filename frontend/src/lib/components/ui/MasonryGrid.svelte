<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Snippet } from "svelte";
  import { MasonryGrid as EgjsMasonryGrid } from "@egjs/grid";

  interface Props {
    gap?: number;
    maxStretchColumnSize?: number;
    align?: "justify" | "stretch" | "start" | "center" | "end";
    defaultDirection?: "end" | "start";
    children?: Snippet;
  }

  let {
    gap = 0,
    maxStretchColumnSize = Infinity,
    align = "justify",
    defaultDirection = "end",
    children
  }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let grid: EgjsMasonryGrid | null = null;
  let observer: MutationObserver | null = null;

  onMount(() => {
    if (!container) return;
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

  $effect(() => {
    // Sync elements when dependencies change
    grid?.syncElements();
  });

  onDestroy(() => {
    observer?.disconnect();
    grid?.destroy();
    grid = null;
  });
</script>

<div bind:this={container} class="masonry-grid-container">
  {@render children?.()}
</div>
