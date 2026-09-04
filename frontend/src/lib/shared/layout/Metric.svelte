<script lang="ts">
import Skeleton from "$lib/shared/ui/Skeleton.svelte";

type Status = "neutral" | "positive" | "negative" | "warning" | "primary";

interface Props {
  label: string;
  value?: string;
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
  secondary,
  trend,
  status = "neutral",
  trendStatus,
  loading = false,
  class: className = "",
}: Props = $props();
</script>

<div class="paisa4-metric {className}">
  <div class="paisa4-metric-label">{label}</div>
  {#if loading}
    <Skeleton width="9rem" height="2rem" />
  {:else}
    <div class="paisa4-metric-value paisa4-metric-{status}">{value}</div>
  {/if}
  {#if secondary || trend}
    <div class="paisa4-metric-meta">
      {#if secondary}<span>{secondary}</span>{/if}
      {#if trend}<span class="paisa4-metric-{trendStatus || status}">{trend}</span>{/if}
    </div>
  {/if}
</div>
