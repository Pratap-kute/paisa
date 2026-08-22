<script lang="ts">
  import _ from "lodash";

  interface Props {
    label: string;
    value: number;
    allowed: { min: number; max: number };
  }

  let { label, value = $bindable(), allowed }: Props = $props();
</script>

{#if allowed.max > 1}
  <div class="paisa-input-range">
    <div class="paisa-input-range-label">{label}</div>
    <input
      type="range"
      bind:value
      min={allowed.min}
      max={allowed.max}
      class="paisa-range"
      step={1}
    />
    <div class="paisa-input-range-ticks">
      {#each _.range(allowed.min, allowed.max + 1) as i}
        <span>{i}</span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .paisa-input-range {
    margin: var(--paisa-space-1, 0.25rem);
  }

  .paisa-input-range-label {
    font-size: 0.75rem;
    color: var(--paisa-foreground);
  }

  .paisa-input-range-ticks {
    display: flex;
    justify-content: space-between;
    margin-top: -3px;
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
  }

  .paisa-range {
    width: 100%;
    height: 1rem;
    appearance: none;
    background: transparent;
  }

  .paisa-range::-webkit-slider-runnable-track {
    height: 0.25rem;
    border-radius: var(--paisa-radius-full);
    background: var(--paisa-border-default);
  }

  .paisa-range::-webkit-slider-thumb {
    width: 1rem;
    height: 1rem;
    margin-top: -0.375rem;
    appearance: none;
    border: 0;
    border-radius: 50%;
    background: var(--paisa-foreground);
  }

  .paisa-range::-moz-range-track {
    height: 0.25rem;
    border-radius: var(--paisa-radius-full);
    background: var(--paisa-border-default);
  }

  .paisa-range::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    border: 0;
    border-radius: 50%;
    background: var(--paisa-foreground);
  }
</style>
