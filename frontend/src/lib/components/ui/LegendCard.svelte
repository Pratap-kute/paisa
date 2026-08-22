<script lang="ts">
  import type { Legend } from "$lib/core/utils";

  interface Props {
    clazz?: string;
    legends: Legend[];
  }

  let { clazz = "", legends }: Props = $props();

  let selectedLegendIndex: number | null = $state(null);

  function onClick(legend: Legend, index: number) {
    if (!legend.onClick) {
      return;
    }

    legend.onClick(legend);
    if (selectedLegendIndex === index) {
      legend.selected = false;
      selectedLegendIndex = null;
    } else {
      if (selectedLegendIndex !== null) legends[selectedLegendIndex].selected = false;
      legend.selected = true;
      selectedLegendIndex = index;
    }
  }
</script>

<div class="flex flex-wrap items-center gap-2 mb-2 {clazz}">
  {#each legends as legend, index}
    {#if legend.onClick}
      <button
        type="button"
        class="legend-box inline-flex items-center gap-2 px-2 py-1 rounded-[var(--paisa-radius-sm)] border-0 bg-transparent m-0 font-inherit text-inherit text-left cursor-pointer hover:bg-[var(--paisa-surface-hover)]"
        onclick={() => onClick(legend, index)}
        aria-pressed={selectedLegendIndex === index}
        class:selected={selectedLegendIndex === index}
      >
        {#if legend.shape == "square"}
          <div
            data-testid="legend-symbol"
            class="shrink-0 rounded-[var(--paisa-radius-sm)]"
            class:legend-pattern-diagonal={legend.symbol == "diagonal-stripe"}
            style="--legend-color: {legend.color}; background-color: {legend.color}; height: 0.875rem; width: 0.875rem;"
          ></div>
        {:else if legend.shape == "line"}
          <div
            data-testid="legend-symbol"
            class="shrink-0"
            style="border-top: 3px solid {legend.color}; height: 0.1rem; width: 1.5rem;"
          ></div>
        {/if}
        <div class="legend-label whitespace-pre custom-icon">
          {legend.label}
          {#if legend.value}<span class="ml-1 text-[var(--paisa-foreground)]">{legend.value}</span>{/if}
        </div>
      </button>
    {:else}
      <div
        class="legend-box inline-flex items-center gap-2 px-2 py-1"
        class:selected={selectedLegendIndex === index}
      >
        {#if legend.shape == "square"}
          <div
            data-testid="legend-symbol"
            class="shrink-0 rounded-[var(--paisa-radius-sm)]"
            class:legend-pattern-diagonal={legend.symbol == "diagonal-stripe"}
            style="--legend-color: {legend.color}; background-color: {legend.color}; height: 0.875rem; width: 0.875rem;"
          ></div>
        {:else if legend.shape == "line"}
          <div
            data-testid="legend-symbol"
            class="shrink-0"
            style="border-top: 3px solid {legend.color}; height: 0.1rem; width: 1.5rem;"
          ></div>
        {/if}
        <div class="legend-label whitespace-pre custom-icon">
          {legend.label}
          {#if legend.value}<span class="ml-1 text-[var(--paisa-foreground)]">{legend.value}</span>{/if}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .legend-label {
    color: var(--paisa-chart-text);
    font-family: var(--paisa-font-sans);
    font-size: var(--paisa-font-size-sm);
    text-transform: capitalize;
    text-align: center;
    line-height: var(--paisa-line-height-normal);
  }

  .legend-box {
    border-radius: var(--paisa-radius-sm);
    transition: background-color var(--paisa-transition-fast);
  }

  .legend-box:hover {
    background-color: var(--paisa-surface-hover);
  }

  .legend-box.selected {
    background-color: var(--paisa-surface-active);
    box-shadow: inset 0 0 0 1px var(--paisa-brand-primary);
  }

  .legend-pattern-diagonal {
    background-image: repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 3px,
      color-mix(in srgb, var(--legend-color) 35%, var(--paisa-foreground)) 3px,
      color-mix(in srgb, var(--legend-color) 35%, var(--paisa-foreground)) 5px
    );
  }
</style>
