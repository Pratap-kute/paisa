<script lang="ts">
  import Badge from "$lib/components/ui/Badge.svelte";
  import type { Confidence } from "$lib/prediction/types";
  import { confidenceLabel } from "$lib/prediction/explain";

  interface Props {
    confidence?: Confidence | null;
    possibleTransfer?: boolean;
  }

  let { confidence = null, possibleTransfer = false }: Props = $props();

  const variant = $derived(
    possibleTransfer || confidence === "NEEDS_REVIEW"
      ? "warning"
      : confidence === "UNKNOWN"
      ? "danger"
      : confidence === "MEDIUM"
      ? "info"
      : "success",
  );

  const quiet = $derived(confidence === "HIGH" && !possibleTransfer);
</script>

{#if confidence && (confidence === "HIGH" || confidence === "MEDIUM" || confidence === "NEEDS_REVIEW" || confidence === "UNKNOWN")}
  <span class="paisa-prediction-badge" class:is-quiet={quiet}>
    <Badge {variant} size="sm" dot={!quiet}>
      {#if possibleTransfer}
        Transfer
      {:else}
        {confidenceLabel(confidence)}
      {/if}
    </Badge>
  </span>
{/if}

<style>
  .paisa-prediction-badge {
    display: inline-flex;
    align-items: center;
    min-height: 1.35rem;

    &.is-quiet {
      opacity: 0.72;
    }
  }
</style>
