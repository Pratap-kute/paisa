<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import { iconText } from "$lib/core/icon";
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

  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    t: Transaction;
  }

  let { t }: Props = $props();
  let posting: Posting = $derived(t.postings[0]);
</script>

<Card padding="xs" interactive>
  <div class="is-flex is-justify-content-space-between is-align-items-baseline">
    <div class="has-text-grey is-size-7 paisa-truncate">
      <PostingStatus {posting} />
      <TransactionNote transaction={t} />
      <a class="secondary-link has-text-weight-medium" href={postingUrl(posting)}>{posting.payee}</a>
    </div>
    <div class="has-text-grey min-w-[110px] has-text-right is-size-7">
      <span class="icon is-small has-text-grey-light">
        <i class="fas fa-calendar"></i>
      </span>
      {posting.date.format("DD MMM YYYY")}
    </div>
  </div>
  <hr class="my-1" />
  {#each t.postings as posting}
    <div class="my-1 is-flex is-justify-content-space-between is-align-items-center">
      <div class="has-text-grey paisa-truncate custom-icon mr-2 is-size-7" title={posting.account}>
        <span style={accountColorStyle(firstName(posting.account))}
          >{iconText(posting.account)}</span
        >
        {restName(posting.account)}
      </div>
      <div class="has-text-weight-bold is-size-6 paisa-nowrap">
        {formatCurrency(posting.amount)}
      </div>
    </div>
  {/each}
</Card>
