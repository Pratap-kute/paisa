<script lang="ts">
  import { postingUrl, type Transaction } from "$lib/core/utils";
  import Postings from "$lib/components/transactions/Postings.svelte";
  import _ from "lodash";
  import PostingStatus from "$lib/components/transactions/PostingStatus.svelte";
  import TransactionNote from "./TransactionNote.svelte";

  interface Props {
    compact?: boolean;
    t: Transaction;
  }

  let { compact = false, t }: Props = $props();

  const debits = (t: Transaction) => {
    return _.filter(t.postings, (p) => p.amount < 0);
  };

  const credits = (t: Transaction) => {
    return _.filter(t.postings, (p) => p.amount >= 0);
  };
</script>

<div class="paisa-transaction-row {compact ? 'is-compact' : ''}">
  <!-- Left Meta Zone: Date, Status, Note, Payee -->
  <div class="paisa-tx-meta">
    <div class="paisa-tx-date">
      {t.date.format("DD MMM YYYY")}
    </div>
    <div class="paisa-tx-payee-group" title={t.payee}>
      <PostingStatus posting={t.postings[0]} />
      <TransactionNote transaction={t} />
      <a class="paisa-payee-link" href={postingUrl(t.postings[0])}>{t.payee}</a>
    </div>
  </div>

  <!-- Debits Column -->
  <div class="paisa-tx-postings-debit">
    <Postings postings={debits(t)} />
  </div>

  <!-- Credits Column -->
  <div class="paisa-tx-postings-credit">
    <Postings postings={credits(t)} />
  </div>
</div>

<style lang="scss">
  .paisa-transaction-row {
    display: grid;
    grid-template-columns: 200px 1fr 1fr;
    gap: 1rem;
    align-items: flex-start;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--paisa-border-subtle);
    transition: background-color var(--paisa-transition-fast);
    background-color: var(--paisa-surface);
    width: 100%;
    box-sizing: border-box;

    &:hover {
      background-color: var(--paisa-surface-hover);
    }

    &.is-compact {
      grid-template-columns: 1fr;
      gap: 0.375rem;
      padding: 0.375rem 0.5rem;
      border-bottom: none;
      background-color: transparent;

      &:hover {
        background-color: transparent;
      }
    }
  }

  .paisa-tx-meta {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    overflow: hidden;
  }

  .paisa-tx-date {
    font-size: 0.6875rem;
    font-family: var(--paisa-font-mono);
    color: var(--paisa-muted-foreground);
    font-weight: 500;
  }

  .paisa-tx-payee-group {
    display: flex;
    align-items: center;
    font-size: 0.8125rem;
    font-weight: 600;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-payee-link {
    color: var(--paisa-foreground);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--paisa-transition-fast);

    &:hover {
      color: var(--paisa-primary);
      text-decoration: underline;
    }
  }

  .paisa-tx-postings-debit,
  .paisa-tx-postings-credit {
    min-width: 0;
    width: 100%;
  }

  @media (max-width: 767px) {
    .paisa-transaction-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
      padding: 0.75rem 0.875rem;
    }

    .paisa-tx-meta {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.25rem;
      border-bottom: 1px dashed var(--paisa-border-subtle);
    }
  }
</style>
