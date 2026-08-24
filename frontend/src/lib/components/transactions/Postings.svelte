<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import { iconText } from "$lib/core/icon";
  import { firstName, formatCurrency, formatFloatUptoPrecision, type Posting } from "$lib/core/utils";

  const unlessDefaultCurrency = (p: Posting) => {
    if (typeof USER_CONFIG !== "undefined" && p.commodity === USER_CONFIG.default_currency) {
      return "";
    } else {
      return `${formatFloatUptoPrecision(p.quantity, 3)} ${
        p.commodity
      } @ ${formatFloatUptoPrecision(p.amount / p.quantity, 4)}`;
    }
  };

  interface Props {
    postings: Posting[];
  }

  let { postings }: Props = $props();
</script>

<div class="paisa-postings-list">
  {#each postings as p}
    <div class="paisa-posting-row">
      <div class="paisa-posting-account" title={p.account}>
        <span class="paisa-account-icon" style={accountColorStyle(firstName(p.account))}>
          {iconText(p.account)}
        </span>
        <span class="paisa-account-name">{p.account}</span>
      </div>
      {#if unlessDefaultCurrency(p)}
        <div class="paisa-posting-commodity" title={unlessDefaultCurrency(p)}>
          {unlessDefaultCurrency(p)}
        </div>
      {/if}
      <div class="paisa-posting-amount {p.amount < 0 ? 'is-negative' : ''}">
        {formatCurrency(p.amount, 2)}
      </div>
    </div>
  {/each}
</div>

<style>
  .paisa-postings-list {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 100%;
  }

  .paisa-posting-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    min-height: 1.25rem;
    width: 100%;
  }

  .paisa-posting-account {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--paisa-foreground);
  }

  .paisa-account-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .paisa-account-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-posting-commodity {
    font-size: 0.6875rem;
    color: var(--paisa-muted-foreground);
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    font-family: var(--paisa-font-mono);
  }

  .paisa-posting-amount {
    font-family: var(--paisa-font-mono);
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
    color: var(--paisa-foreground);
    min-width: 5.5rem;

    &.is-negative {
      color: var(--paisa-muted-foreground);
    }
  }
</style>
