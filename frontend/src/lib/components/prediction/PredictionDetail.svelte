<script lang="ts">
  import Select from "svelte-select";
  import type { PredictionResult } from "$lib/prediction/types";
  import { confidenceLabel, shortReasons } from "$lib/prediction/explain";
  import { accountMatchesPrefix } from "$lib/prediction/score";
  import PredictionRowBadge from "./PredictionRowBadge.svelte";

  interface Props {
    result?: PredictionResult | null;
    accounts?: string[];
    onOverride?: (account: string) => void;
    onApplySimilar?: (account: string) => void;
    onAlwaysUse?: (account: string) => void;
  }

  let {
    result = null,
    accounts = [],
    onOverride,
    onApplySimilar,
    onAlwaysUse,
  }: Props = $props();

  let selectedAccount = $derived(result?.account || "");

  const items = $derived(
    [...new Set([
      ...(result?.account ? [result.account] : []),
      ...accounts.filter((account) =>
        !result?.prefix || accountMatchesPrefix(account, result.prefix)
      ),
      ...(result?.alternatives || [])
        .filter((item) =>
          !result?.prefix || accountMatchesPrefix(item.account, result.prefix)
        )
        .map((item) => item.account),
    ])].filter(Boolean).map((account) => ({ value: account, label: account })),
  );
</script>

{#if result}
  <div class="paisa-prediction-detail" data-testid="prediction-detail">
    <div class="paisa-prediction-detail-head">
      <PredictionRowBadge
        confidence={result.confidence}
        possibleTransfer={result.possibleTransfer}
      />
      <span class="is-size-7 has-text-weight-semibold">{confidenceLabel(result.confidence)}</span>
    </div>
    <Select
      --list-z-index="40"
      items={items}
      value={{ value: selectedAccount, label: selectedAccount }}
      showChevron={true}
      searchable={true}
      clearable={false}
      on:change={(e) => {
        const account = e.detail?.value;
        if (account) onOverride?.(account);
      }}
    />
    <ul class="paisa-prediction-reasons">
      {#each shortReasons(result.reasons || []) as reason}
        <li>{reason}</li>
      {/each}
    </ul>
    {#if (result.alternatives || []).length > 0}
      <div class="is-size-7 has-text-grey mb-1">Alternatives</div>
      {#each result.alternatives.slice(0, 3) as alternative}
        <button
          type="button"
          class="button is-small is-light mb-1"
          onclick={() => onOverride?.(alternative.account)}
        >
          {alternative.account}
        </button>
      {/each}
    {/if}
    <div class="paisa-prediction-detail-actions">
      <button
        type="button"
        class="button is-small"
        onclick={() => onApplySimilar?.(selectedAccount)}
      >
        Apply to similar rows in this import
      </button>
      <button
        type="button"
        class="button is-small is-light"
        onclick={() => onAlwaysUse?.(selectedAccount)}
      >
        Always use this account for this merchant
      </button>
    </div>
  </div>
{/if}

<style lang="scss">
  .paisa-prediction-detail {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-2);
    border-top: 1px solid var(--paisa-border-subtle);
    background-color: var(--paisa-surface-muted);
  }

  .paisa-prediction-detail-head {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
  }

  .paisa-prediction-reasons {
    margin: 0;
    padding-left: 1.1rem;
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-secondary);
  }

  .paisa-prediction-detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--paisa-space-1);
  }
</style>
