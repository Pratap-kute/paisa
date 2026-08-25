<script lang="ts">
import type { Transaction } from "$lib/domain/ledger";
import { formatTextAsHtml } from "$lib/shared/ui/rich_text";
import Tooltip from "$lib/shared/ui/Tooltip.svelte";
interface Props {
  transaction: Transaction;
}

let { transaction }: Props = $props();
</script>

{#if transaction.note != ""}
  <Tooltip content={formatTextAsHtml(transaction.note)}>
    {#snippet children(tooltipProps)}
      <button {...tooltipProps} type="button" class="paisa-note-icon" title={transaction.note}>
        <i class="fa-regular fa-comment-dots"></i>
      </button>
    {/snippet}
  </Tooltip>
{/if}

<style>
.paisa-note-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 10px;
  margin-right: 4px;
  color: var(--paisa-muted-foreground);
  border: 0;
  padding: 0;
  background: transparent;
  vertical-align: middle;
  cursor: help;
}
</style>
