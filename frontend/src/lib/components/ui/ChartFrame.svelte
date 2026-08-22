<script lang="ts">
  import type { Snippet } from "svelte";
  import ErrorState from "./ErrorState.svelte";
  import Spinner from "./Spinner.svelte";
  import ZeroState from "./ZeroState.svelte";
  import { observeElementSize, type Dimensions } from "$lib/charts/resize";

  type ChartType = "timeline" | "dashboard-timeline" | "category" | "distribution" | "dynamic";
  type ChartSize = "compact" | "standard" | "large" | "dynamic";

  interface Props {
    type?: ChartType;
    size?: ChartSize;
    rows?: number;
    centered?: boolean;
    title?: string;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    preserveChildren?: boolean;
    error?: boolean;
    errorTitle?: string;
    errorMessage?: string;
    class?: string;
    style?: string;
    id?: string;
    actions?: Snippet;
    children?: Snippet;
    onresize?: (dimensions: Dimensions) => void;
  }

  let {
    type,
    size = "standard",
    rows = 6,
    centered = false,
    title,
    loading = false,
    empty = false,
    emptyMessage = "No data available for the selected period.",
    preserveChildren = false,
    error = false,
    errorTitle = "Something went wrong",
    errorMessage = "An error occurred while loading this visualization.",
    class: className = "",
    style = "",
    id,
    actions,
    children,
    onresize,
  }: Props = $props();

  let frameBody: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (frameBody && onresize) {
      const body = frameBody;
      const resize = onresize;
      const cleanup = observeElementSize(body, (dimensions) => {
        if (type === "timeline") {
          const svg = body.querySelector("svg");
          if (svg) {
            svg.setAttribute("width", String(dimensions.width));
            svg.setAttribute("height", String(dimensions.height));
          }
        }
        resize(dimensions);
      });
      return cleanup;
    }
  });

  const typeClasses: Record<ChartType, string> = {
    timeline: "paisa-chart-type-timeline",
    "dashboard-timeline": "paisa-chart-type-dashboard-timeline",
    category: "paisa-chart-type-category",
    distribution: "paisa-chart-type-distribution",
    dynamic: "paisa-chart-dynamic",
  };

  const sizeClasses: Record<ChartSize, string> = {
    compact: "paisa-chart-compact",
    standard: "paisa-chart-standard",
    large: "paisa-chart-large",
    dynamic: "paisa-chart-dynamic",
  };

  const typeOrSizeClass = $derived(
    type ? typeClasses[type] : (sizeClasses[size] || "paisa-chart-standard")
  );
</script>

<div
  {id}
  class="paisa-chart-frame {typeOrSizeClass} {centered ? 'paisa-chart-centered' : ''} {className}"
  style="--paisa-chart-rows: {rows}; {style}"
>
  {#if title || actions}
    <div class="paisa-chart-frame-header">
      {#if title}
        <h3 class="paisa-chart-frame-title">{title}</h3>
      {/if}
      {#if actions}
        <div class="paisa-chart-frame-actions">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}

  <div class="paisa-chart-frame-body" bind:this={frameBody}>
    {#if loading}
      <div class="paisa-chart-frame-loading">
        <Spinner />
      </div>
    {:else if error}
      <div class="paisa-chart-frame-error">
        <ErrorState title={errorTitle} message={errorMessage} />
      </div>
    {:else if empty}
      <div class="paisa-chart-frame-empty">
        <ZeroState item={false}>
          {emptyMessage}
        </ZeroState>
      </div>
      {#if preserveChildren}
        <div class="paisa-chart-frame-preserved" aria-hidden="true">
          {@render children?.()}
        </div>
      {/if}
    {:else}
      {@render children?.()}
    {/if}
  </div>
</div>

<style>
  .paisa-chart-frame {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;
    overflow: hidden;
  }

  .paisa-chart-frame-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--paisa-space-3);
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
  }

  .paisa-chart-frame-title {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-secondary);
    margin: 0;
  }

  .paisa-chart-frame-actions {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
  }

  .paisa-chart-frame-body {
    width: 100%;
    flex: 1 1 auto;
    position: relative;
    min-height: inherit;

    :global(svg) {
      display: block;
      width: 100%;
      overflow: visible;
    }
  }

  .paisa-chart-centered .paisa-chart-frame-body {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Semantic Types */
  /* Analysis timelines grow into leftover viewport when a fill Section
     is used. Dashboard charts stay compact. */
  .paisa-chart-type-timeline {
    flex: 1 1 auto;
    min-height: 380px;
  }

  .paisa-chart-type-timeline .paisa-chart-frame-body {
    min-height: 0;
  }

  .paisa-chart-type-timeline .paisa-chart-frame-body :global(svg) {
    width: 100%;
    height: 100%;
  }

  @media screen and (max-width: 768px) {
    .paisa-chart-type-timeline {
      min-height: 280px;
    }
  }

  .paisa-chart-type-dashboard-timeline {
    min-height: clamp(220px, 28vh, 300px);
  }

  .paisa-chart-type-category {
    min-height: clamp(180px, calc(var(--paisa-chart-rows, 6) * 28px + 40px), 480px);
  }

  .paisa-chart-type-distribution {
    min-height: 280px;
  }

  /* Fallback Semantic sizes */
  .paisa-chart-compact {
    min-height: 240px;
  }

  .paisa-chart-standard {
    min-height: 360px;
  }

  .paisa-chart-large {
    min-height: 480px;
  }

  .paisa-chart-dynamic {
    min-height: auto;
  }

  .paisa-chart-frame-loading,
  .paisa-chart-frame-error,
  .paisa-chart-frame-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
  }

  .paisa-chart-frame-preserved {
    position: absolute;
    inset: 0;
    visibility: hidden;
    pointer-events: none;
  }
</style>
