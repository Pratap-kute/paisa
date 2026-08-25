<script lang="ts">
import type { Transaction } from "$lib/domain/ledger";
import { formatTextAsHtml } from "$lib/shared/ui/rich_text";
interface Props {
  transaction: Transaction;
}

let { transaction }: Props = $props();
</script>

{#if transaction.note != ""}
  <span class="paisa-note-icon"
  data-tippy-content={formatTextAsHtml(transaction.note)}
  title={transaction.note}>
  <i class="fa-regular fa-comment-dots"></i>
</span>
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
  vertical-align: middle;
  cursor: help;
}
</style>
