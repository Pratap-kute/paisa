<script lang="ts">
  import { formatPercentage } from "$lib/core/utils";

  interface Props {
    value: number;
  }

  let { value }: Props = $props();
  let icon = $derived(value > 0 ? "fa-arrow-up rotate-45" : "fa-arrow-down -rotate-45");
  let color = $derived(value > 0 ? "has-text-success" : "has-text-danger");
</script>

{#if value === null}
  <span></span>
{:else if value == 0}
  <span class="has-text-grey-light">{formatPercentage(value, 2)}</span>
{:else}
  <span class="{color} paisa-nowrap">
    <span class="icon is-small">
      <i class="fas {icon}"></i>
    </span>
    {formatPercentage(value, 2)}
  </span>
{/if}
