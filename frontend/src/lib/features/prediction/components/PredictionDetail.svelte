<script lang="ts">
import Select from "svelte-select";
import type { PredictionResult } from "$lib/features/prediction/types";
import {
  confidenceLabel,
  shortReasons,
} from "$lib/features/prediction/explain";
import { accountMatchesPrefix } from "$lib/features/prediction/score";
import PredictionRowBadge from "./PredictionRowBadge.svelte";

interface Props {
  result?: PredictionResult | null;
  accounts?: string[];
  onOverride?: (account: string) => void;
  onApplySimilar?: (account: string) => void;
  onAlwaysUse?: (account: string) => void;
  onConfirmNext?: () => void;
  onClose?: () => void;
}

let {
  result = null,
  accounts = [],
  onOverride,
  onApplySimilar,
  onAlwaysUse,
  onConfirmNext,
  onClose,
}: Props = $props();

let selectedAccount = $derived(result?.account || "");

const items = $derived(
  [
    ...new Set([
      ...(result?.account ? [result.account] : []),
      ...accounts.filter((account) =>
        !result?.prefix || accountMatchesPrefix(account, result.prefix)
      ),
      ...(result?.alternatives || [])
        .filter((item) =>
          !result?.prefix || accountMatchesPrefix(item.account, result.prefix)
        )
        .map((item) => item.account),
    ]),
  ].filter(Boolean).map((account) => ({ value: account, label: account })),
);

const confidenceScore = $derived(
  result?.score ? Math.min(100, Math.max(0, Math.round(result.score))) : null,
);
</script>

{#if result}
  <div class="paisa-prediction-detail" data-testid="prediction-detail">
    <div class="paisa-prediction-detail-head">
      <div class="paisa-detail-header-left">
        <span class="paisa-detail-title">Selected Row Review</span>
        {#if result.merchantKey}
          <span class="paisa-detail-merchant">({result.merchantKey})</span>
        {/if}
      </div>
      <div class="paisa-detail-header-right">
        <PredictionRowBadge
          confidence={result.confidence}
          possibleTransfer={result.possibleTransfer}
        />
        {#if confidenceScore !== null}
          <span class="paisa-confidence-pct">{confidenceScore}%</span>
        {/if}
        {#if onClose}
          <button
            type="button"
            class="paisa-inspector-close-btn"
            aria-label="Close Inspector"
            onclick={() => onClose?.()}
          >
            <i class="fas fa-xmark"></i>
          </button>
        {/if}
      </div>
    </div>

    <div class="paisa-detail-field">
      <label class="paisa-detail-label" for="predict-account-select">Suggested Account</label>
      <div class="paisa-select-container" id="predict-account-select">
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
      </div>
    </div>

    {#if (result.reasons || []).length > 0}
      <ul class="paisa-prediction-reasons">
        {#each shortReasons(result.reasons || []) as reason}
          <li>{reason}</li>
        {/each}
      </ul>
    {/if}

    {#if (result.alternatives || []).length > 0}
      <div class="paisa-detail-alternatives">
        <span class="paisa-detail-sublabel">Alternative Accounts:</span>
        <div class="paisa-alt-buttons">
          {#each result.alternatives.slice(0, 3) as alternative}
            <button
              type="button"
              class="paisa-alt-btn"
              onclick={() => onOverride?.(alternative.account)}
            >
              {alternative.account}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="paisa-prediction-detail-actions">
      <div class="paisa-action-group-secondary">
        <button
          type="button"
          class="paisa-action-btn"
          onclick={() => onApplySimilar?.(selectedAccount)}
        >
          <span class="inline-flex items-center text-xs"><i class="fas fa-layer-group"></i></span>
          <span>Apply to similar rows in this import</span>
        </button>
        <button
          type="button"
          class="paisa-action-btn paisa-action-btn-subtle"
          onclick={() => onAlwaysUse?.(selectedAccount)}
        >
          <span class="inline-flex items-center text-xs"><i class="fas fa-bookmark"></i></span>
          <span>Always use this account for this merchant</span>
        </button>
      </div>

      {#if onConfirmNext}
        <button
          type="button"
          class="paisa-action-btn paisa-action-btn-primary"
          onclick={() => onConfirmNext?.()}
        >
          <span>Confirm & Next Review</span>
          <span class="inline-flex items-center text-xs"><i class="fas fa-arrow-right"></i></span>
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
.paisa-prediction-detail {
  display: flex;
  flex-direction: column;
  gap: var(--paisa-space-2, 0.5rem);
  padding: var(--paisa-space-3, 0.75rem);
  border-top: 1px solid var(--paisa-border-default, #e2e8f0);
  background-color: var(--paisa-surface-card, #ffffff);
}

.paisa-prediction-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--paisa-space-2, 0.5rem);
}

.paisa-detail-header-left {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--paisa-text-primary, #0f172a);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.paisa-detail-merchant {
  color: var(--paisa-text-secondary, #64748b);
  text-transform: none;
  font-weight: normal;
}

.paisa-detail-header-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.paisa-confidence-pct {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--paisa-text-secondary, #64748b);
}

.paisa-inspector-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  background: transparent;
  color: var(--paisa-text-muted, #94a3b8);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.12s ease;

  &:hover {
    background-color: var(--paisa-surface-muted, #f1f5f9);
    color: var(--paisa-text-primary, #0f172a);
  }
}

.paisa-detail-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paisa-detail-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--paisa-text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.paisa-select-container {
  width: 100%;

  :global(.svelte-select) {
    border: 1px solid var(--paisa-border-default, #cbd5e1);
    background-color: var(--paisa-canvas-bg, #f8fafc);
    border-radius: var(--paisa-radius-sm, 0.375rem);
    font-size: 0.8125rem;
    min-height: 36px;
  }
}

.paisa-prediction-reasons {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.75rem;
  color: var(--paisa-text-secondary, #64748b);
  line-height: 1.4;
}

.paisa-detail-alternatives {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paisa-detail-sublabel {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--paisa-text-muted, #94a3b8);
}

.paisa-alt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.paisa-alt-btn {
  font-size: 0.6875rem;
  padding: 0.1875rem 0.5rem;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  border: 1px solid var(--paisa-border-subtle, #e2e8f0);
  background-color: var(--paisa-surface-muted, #f1f5f9);
  color: var(--paisa-text-secondary, #475569);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--paisa-surface-hover, #e2e8f0);
    color: var(--paisa-text-primary, #0f172a);
  }
}

.paisa-prediction-detail-actions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.paisa-action-group-secondary {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paisa-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  border: 1px solid var(--paisa-border-default, #cbd5e1);
  background-color: var(--paisa-surface-card, #ffffff);
  color: var(--paisa-text-primary, #0f172a);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: var(--paisa-surface-hover, #f8fafc);
    border-color: var(--paisa-border-focus, #3b82f6);
  }
}

.paisa-action-btn-subtle {
  border: none;
  background: transparent;
  color: var(--paisa-text-secondary, #64748b);
  justify-content: flex-start;
  padding: 0.25rem 0;
}

.paisa-action-btn-subtle:hover {
  background: transparent;
  color: var(--paisa-text-primary, #0f172a);
}

.paisa-action-btn-primary {
  background-color: var(--paisa-brand-primary, #3b82f6);
  border-color: var(--paisa-brand-primary, #3b82f6);
  color: #ffffff;
  font-weight: 600;
}

.paisa-action-btn-primary:hover {
  filter: brightness(1.08);
}
</style>
