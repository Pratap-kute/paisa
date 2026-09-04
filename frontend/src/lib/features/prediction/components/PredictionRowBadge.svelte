<script lang="ts">
import Badge from "$lib/shared/ui/Badge.svelte";
import type { Confidence } from "$lib/features/prediction/types";
import { confidenceLabel } from "$lib/features/prediction/explain";

interface Props {
  confidence?: Confidence | null;
  possibleTransfer?: boolean;
  resolved?: boolean;
}

let { confidence = null, possibleTransfer = false, resolved = false }: Props =
  $props();

const variant = $derived(
  resolved
    ? "success"
    : possibleTransfer || confidence === "NEEDS_REVIEW"
    ? "warning"
    : confidence === "UNKNOWN"
    ? "danger"
    : confidence === "MEDIUM"
    ? "info"
    : "success",
);

const quiet = $derived(
  resolved || (confidence === "HIGH" && !possibleTransfer),
);
</script>

{#if confidence && (confidence === "HIGH" || confidence === "MEDIUM" || confidence === "NEEDS_REVIEW" || confidence === "UNKNOWN")}
  <span class="paisa-prediction-badge" class:is-quiet={quiet}
  class:is-resolved={resolved}>
  <Badge {variant} size="sm" dot={!quiet && !resolved}>
      {#if resolved}
        <i class="fas fa-check mr-1 text-[10px]"></i>
      {/if}
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
    opacity: 0.8;
  }

  &.is-resolved {
    opacity: 0.9;
  }
}
</style>
