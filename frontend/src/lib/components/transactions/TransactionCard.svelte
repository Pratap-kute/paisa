<script lang="ts">
  import { accountColorStyle } from "$lib/shared/theme/colors";
  import { iconText } from "$lib/shared/ui/icon";
  import {
    formatCurrency,
    postingUrl,
    restName,
    type Posting,
    type Transaction,
    firstName
  } from "$lib/core/utils";
  import PostingStatus from "./PostingStatus.svelte";
  import TransactionNote from "./TransactionNote.svelte";

  import Card from "$lib/shared/ui/Card.svelte";

  interface Props {
    t: Transaction;
  }

  let { t }: Props = $props();
  let posting: Posting = $derived(t.postings[0]);
</script>

<Card padding="xs" interactive>
  <div class="flex items-baseline justify-between">
    <div class="truncate text-xs text-[var(--paisa-muted-foreground)]">
      <PostingStatus {posting} />
      <TransactionNote transaction={t} />
      <a
        class="font-medium text-[var(--paisa-primary)] hover:underline"
        href={postingUrl(posting)}>{posting.payee}</a>
    </div>
    <div class="min-w-[110px] text-right text-xs text-[var(--paisa-muted-foreground)]">
      <span class="text-[var(--paisa-muted-foreground)]">
        <i class="fas fa-calendar text-[10px]" aria-hidden="true"></i>
      </span>
      {posting.date.format("DD MMM YYYY")}
    </div>
  </div>
  <hr class="my-1" />
  {#each t.postings as posting}
    <div class="my-1 flex items-center justify-between">
      <div
        class="mr-2 truncate text-xs text-[var(--paisa-muted-foreground)] custom-icon"
        title={posting.account}
      >
        <span style={accountColorStyle(firstName(posting.account))}
          >{iconText(posting.account)}</span
        >
        {restName(posting.account)}
      </div>
      <div class="text-base font-bold paisa-nowrap tabular-nums">
        {formatCurrency(posting.amount)}
      </div>
    </div>
  {/each}
</Card>
