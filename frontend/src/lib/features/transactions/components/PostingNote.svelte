<script lang="ts">
import type { Posting } from "$lib/domain/ledger";
import { formatTextAsHtml } from "$lib/shared/ui/rich_text";
import Tooltip from "$lib/shared/ui/Tooltip.svelte";
interface Props {
  posting: Posting;
}

let { posting }: Props = $props();
</script>

{#if posting.note != ""}
  <Tooltip content={formatTextAsHtml(posting.note)}>
    {#snippet children(tooltipProps)}
      <button {...tooltipProps} type="button" class="inline-flex items-center border-0 bg-transparent p-0 text-xs">
        <i class="fa-regular fa-comment-dots"></i>
      </button>
    {/snippet}
  </Tooltip>
{/if}
