<script lang="ts">
  import type { Snippet } from "svelte";
  import Spinner from "./Spinner.svelte";
  import ZeroState from "./ZeroState.svelte";

  type ChartSize = "compact" | "standard" | "large" | "dynamic";

  interface Props {
    size?: ChartSize;
    title?: string;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    class?: string;
    id?: string;
    actions?: Snippet;
    children?: Snippet;
  }

  let {
    size = "standard",
    title,
    loading = false,
    empty = false,
    emptyMessage = "No data available for the selected period.",
    class: className = "",
    id,
    actions,
    children,
  }: Props = $props();

  const sizeClasses: Record<ChartSize, string> = {
    compact: "paisa-chart-compact",
    standard: "paisa-chart-standard",
    large: "paisa-chart-large",
    dynamic: "paisa-chart-dynamic",
  };
</script>

<div {id} class="paisa-chart-frame {sizeClasses[size]} {className}">
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

  <div class="paisa-chart-frame-body">
    {#if loading}
      <div class="paisa-chart-frame-loading">
        <Spinner />
      </div>
    {:else if empty}
      <div class="paisa-chart-frame-empty">
        <ZeroState item={false}>
          {emptyMessage}
        </ZeroState>
      </div>
    {:else}
      {@render children?.()}
    {/if}
  </div>
</div>

<style lang="scss">
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
      height: 100%;
      overflow: visible;
    }
  }

  /* Semantic sizes */
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
  .paisa-chart-frame-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
  }
</style>
