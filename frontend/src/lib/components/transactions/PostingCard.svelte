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
  <div class="is-flex is-justify-content-space-between">
    <div class="has-text-grey is-size-7 paisa-truncate">
      <PostingStatus {posting} />
      <PostingNote {posting} />
      <a class="secondary-link" href={postingUrl(posting)}>{posting.payee}</a>
    </div>
    <div class="has-text-grey min-w-[110px] has-text-right">
      <span class="icon is-small has-text-grey-light">
        <i class="fas fa-calendar"></i>
      </span>
      {posting.date.format("DD MMM YYYY")}
    </div>
  </div>
  <hr class="my-1" />
  <div class="is-flex is-justify-content-space-between">
    <div class="has-text-grey paisa-truncate custom-icon">
      {#if icon}
        {iconify(restName(posting.account), { group: firstName(posting.account) })}
      {:else}
        {posting.account}
      {/if}
    </div>
    <div class="is-flex is-align-items-baseline">
      <div
        class="has-text-grey mr-1 paisa-truncate is-size-7"
        class:is-hidden={posting.quantity == posting.amount}
      >
        {formatFloat(posting.quantity, 4)} @ {formatFloat(posting.amount / posting.quantity, 3)}
      </div>
      <div class="has-text-weight-bold is-size-6">{formatCurrency(posting.amount)}</div>
    </div>
  </div>
</Card>
