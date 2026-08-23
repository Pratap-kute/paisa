<script lang="ts">
  import type { Snippet } from "svelte";
  import ErrorState from "./ErrorState.svelte";
  import Spinner from "./Spinner.svelte";
  import ZeroState from "./ZeroState.svelte";

  type ChartHeight = "compact" | "standard" | "tall" | "content";

  interface Props {
    height?: ChartHeight;
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
  }

  let {
    height = "standard",
    rows,
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
  }: Props = $props();

  const heightClass = $derived(`paisa-chart-height-${height}`);
  const rowClass = $derived(rows === undefined ? "" : "paisa-chart-row-aware");
</script>

<div
  {id}
  class="paisa-chart-frame {heightClass} {rowClass} {centered ? 'paisa-chart-centered' : ''} {className}"
  style="--paisa-chart-rows: {rows ?? 0}; {style}"
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

  <div class="paisa-chart-frame-body">
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
    min-width: 0;
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
    min-width: 0;
    flex: 1 1 auto;
    position: relative;
    min-height: 0;

  }

  .paisa-chart-centered .paisa-chart-frame-body {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .paisa-chart-height-compact {
    height: clamp(220px, 28vh, 280px);
  }

  .paisa-chart-height-standard {
    height: 320px;
  }

  .paisa-chart-height-tall {
    height: clamp(360px, 42vh, 420px);
  }

  .paisa-chart-height-content {
    height: auto;
  }

  .paisa-chart-row-aware {
    height: clamp(200px, calc(var(--paisa-chart-rows) * 30px + 48px), 480px);
  }

  @media screen and (max-width: 768px) {
    .paisa-chart-height-standard,
    .paisa-chart-height-tall {
      height: 300px;
    }

    .paisa-chart-row-aware {
      height: clamp(200px, calc(var(--paisa-chart-rows) * 28px + 44px), 420px);
    }
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
