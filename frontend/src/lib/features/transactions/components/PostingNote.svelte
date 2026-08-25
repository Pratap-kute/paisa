<script lang="ts">
import type { Posting } from "$lib/domain/ledger";
import { formatTextAsHtml } from "$lib/shared/ui/rich_text";
interface Props {
  posting: Posting;
}

let { posting }: Props = $props();
</script>

{#if posting.note != ""}
  <span class="inline-flex items-center text-xs"
  data-tippy-content={formatTextAsHtml(posting.note)}>
  <i class="fa-regular fa-comment-dots"></i>
</span>
{/if}
