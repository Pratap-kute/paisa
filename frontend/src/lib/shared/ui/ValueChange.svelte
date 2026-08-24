<script lang="ts">
  import { formatPercentage } from "$lib/core/utils";

  interface Props {
    value: number;
  }

  let { value }: Props = $props();
  let icon = $derived(value > 0 ? "fa-arrow-up rotate-45" : "fa-arrow-down -rotate-45");
  let toneClass = $derived(value > 0 ? "paisa-value-change-positive" : "paisa-value-change-negative");
</script>

{#if value === null}
  <span></span>
{:else if value == 0}
  <span class="paisa-value-change-neutral">{formatPercentage(value, 2)}</span>
{:else}
  <span class="paisa-value-change {toneClass}">
    <span class="paisa-value-change-icon" aria-hidden="true">
      <i class="fas {icon}"></i>
    </span>
    {formatPercentage(value, 2)}
  </span>
{/if}

<style>
  .paisa-value-change {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    white-space: nowrap;
  }

  .paisa-value-change-positive {
    color: var(--paisa-positive);
  }

  .paisa-value-change-negative {
    color: var(--paisa-negative);
  }

  .paisa-value-change-neutral {
    color: var(--paisa-muted-foreground);
    white-space: nowrap;
  }

  .paisa-value-change-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
  }
</style>
