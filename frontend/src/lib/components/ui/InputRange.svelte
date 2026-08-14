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
  <div class="m-1">
    <div class="is-size-7">{label}</div>
    <input
      type="range"
      bind:value
      min={allowed.min}
      max={allowed.max}
      class="paisa-range"
      step={1}
    />
    <div
      class="is-size-7 is-flex is-justify-content-space-between has-text-grey"
      style="margin-top: -3px"
    >
      {#each _.range(allowed.min, allowed.max + 1) as i}
        <span>{i}</span>
      {/each}
    </div>
  </div>
{/if}
