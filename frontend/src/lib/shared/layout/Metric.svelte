<script lang="ts">
  import Skeleton from "$lib/shared/ui/Skeleton.svelte";

  type Status = "neutral" | "positive" | "negative" | "warning" | "primary";

  interface Props {
    label: string;
    value?: string;
    // Shown as the tooltip when value is abbreviated (for example 2.03Cr).
    fullValue?: string;
    secondary?: string;
    trend?: string;
    status?: Status;
    trendStatus?: Status;
    loading?: boolean;
    class?: string;
  }

  let {
    label,
    value = "",
    fullValue,
    secondary,
    trend,
    status = "neutral",
    trendStatus,
    loading = false,
    class: className = "",
  }: Props = $props();

  // Words such as "Not configured" wrap instead of being cut off by the ellipsis
  // that keeps long numbers on one line.
  let isText = $derived(/[a-z]{3,}/.test(value));
</script>

<div class="paisa4-metric {className}">
  <div class="paisa4-metric-label">{label}</div>
  {#if loading}
    <Skeleton width="9rem" height="2rem" />
  {:else}
    <div
      class="paisa4-metric-value paisa4-metric-{status}"
      class:paisa4-metric-text={isText}
      title={fullValue ?? value}
    >
      {value}
    </div>
  {/if}
  {#if secondary || trend}
    <div class="paisa4-metric-meta">
      {#if secondary}<span>{secondary}</span>{/if}
      {#if trend}<span class="paisa4-metric-{trendStatus || status}"
          >{trend}</span
        >{/if}
    </div>
  {/if}
</div>
