<script lang="ts">
  import { iconify } from "$lib/core/icon";
  import {
    formatCurrency,
    formatFloat,
    postingUrl,
    type Posting,
    firstName,
    restName
  } from "$lib/core/utils";
  import PostingNote from "./PostingNote.svelte";
  import PostingStatus from "./PostingStatus.svelte";

  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    posting: Posting;
    color: string;
    icon?: boolean;
  }

  let { posting, color, icon = false }: Props = $props();
</script>

<Card padding="xs" class="my-2" style="border-left: 2px solid {color}">
  <div class="flex justify-between">
    <div class="truncate text-xs text-[var(--paisa-muted-foreground)]">
      <PostingStatus {posting} />
      <PostingNote {posting} />
      <a class="text-[var(--paisa-primary)] hover:underline" href={postingUrl(posting)}>{posting.payee}</a>
    </div>
    <div class="min-w-[110px] text-right text-[var(--paisa-muted-foreground)]">
      <span class="text-[var(--paisa-muted-foreground)]">
        <i class="fas fa-calendar text-[10px]" aria-hidden="true"></i>
      </span>
      {posting.date.format("DD MMM YYYY")}
    </div>
  </div>
  <hr class="my-1" />
  <div class="flex justify-between">
    <div class="truncate text-[var(--paisa-muted-foreground)] custom-icon">
      {#if icon}
        {iconify(restName(posting.account), { group: firstName(posting.account) })}
      {:else}
        {posting.account}
      {/if}
    </div>
    <div class="flex items-baseline">
      <div
        class="mr-1 truncate text-xs text-[var(--paisa-muted-foreground)]"
        class:hidden={posting.quantity == posting.amount}
      >
        {formatFloat(posting.quantity, 4)} @ {formatFloat(posting.amount / posting.quantity, 3)}
      </div>
      <div class="text-base font-bold tabular-nums">{formatCurrency(posting.amount)}</div>
    </div>
  </div>
</Card>
