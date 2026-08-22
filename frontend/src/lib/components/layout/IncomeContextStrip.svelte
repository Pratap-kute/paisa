<script lang="ts">
  import Separator from "$lib/components/ui/Separator.svelte";

  interface Props {
    income?: string;
    tax?: string;
    taxRate?: string;
    savings?: string;
    savingsRate?: string;
    netIncome?: string;
  }

  let {
    income = "",
    tax = "",
    taxRate = "",
    savings = "",
    savingsRate = "",
    netIncome = "",
  }: Props = $props();

  let headline = $derived(netIncome || income || "—");
</script>

<details class="paisa-income-context paisa-income-context-mobile">
  <summary class="paisa-income-context-summary">
    <span class="paisa-income-context-label">Income Context</span>
    <span class="paisa-income-context-headline">{headline}</span>
  </summary>
  <div class="paisa-income-context-items">
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Gross Income</span>
      <span class="paisa-income-context-item-value">{income || "—"}</span>
    </div>
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Tax</span>
      <span class="paisa-income-context-item-value">
        {tax ? `${tax}${taxRate ? ` (${taxRate})` : ""}` : "—"}
      </span>
    </div>
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Net Investment / Savings</span>
      <span class="paisa-income-context-item-value paisa-income-context-savings">
        {savings || "—"}{savingsRate ? ` (${savingsRate})` : ""}
      </span>
    </div>
  </div>
</details>

<div class="paisa-income-context paisa-income-context-desktop" aria-label="Income context">
  <span class="paisa-income-context-heading">Income Context</span>
  <div class="paisa-income-context-strip">
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Gross Income</span>
      <span class="paisa-income-context-item-value">{income || "—"}</span>
    </div>
    <Separator orientation="vertical" decorative />
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Tax</span>
      <span class="paisa-income-context-item-value">
        {tax ? `${tax}${taxRate ? ` (${taxRate})` : ""}` : "—"}
      </span>
    </div>
    <Separator orientation="vertical" decorative />
    <div class="paisa-income-context-item">
      <span class="paisa-income-context-item-label">Net Investment / Savings</span>
      <span class="paisa-income-context-item-value paisa-income-context-savings">
        {savings || "—"}{savingsRate ? ` (${savingsRate})` : ""}
      </span>
    </div>
  </div>
</div>

<style>
  .paisa-income-context {
    min-width: 0;
  }

  .paisa-income-context-mobile {
    margin-top: var(--paisa-space-3);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background-color: var(--paisa-surface);
    overflow: hidden;

    @media screen and (min-width: 768px) {
      display: none;
    }
  }

  .paisa-income-context-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-3);
    padding: var(--paisa-space-3) var(--paisa-space-4);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  .paisa-income-context-label {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-muted-foreground);
  }

  .paisa-income-context-headline {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    font-variant-numeric: tabular-nums;
    color: var(--paisa-foreground);
  }

  .paisa-income-context-items {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    padding: 0 var(--paisa-space-4) var(--paisa-space-3);
    border-top: 1px solid var(--paisa-border-subtle);
  }

  .paisa-income-context-desktop {
    display: none;
    margin-top: var(--paisa-space-4);
    padding: var(--paisa-space-3) var(--paisa-space-4);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background-color: var(--paisa-surface);
    gap: var(--paisa-space-3);

    @media screen and (min-width: 768px) {
      display: flex;
      flex-direction: column;
    }
  }

  .paisa-income-context-heading {
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--paisa-muted-foreground);
  }

  .paisa-income-context-strip {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-4);
  }

  .paisa-income-context-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .paisa-income-context-item-label {
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--paisa-muted-foreground);
  }

  .paisa-income-context-item-value {
    font-size: var(--paisa-font-size-sm);
    font-variant-numeric: tabular-nums;
    color: var(--paisa-foreground);
  }

  .paisa-income-context-savings {
    color: var(--paisa-primary);
  }
</style>
