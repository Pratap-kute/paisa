<script lang="ts">
import Select from "svelte-select";
import type {
  PredictionInput,
  PredictionResult,
  PredictionReviewStatus,
} from "$lib/features/prediction/types";
import {
  confidenceLabel,
  shortReasons,
} from "$lib/features/prediction/explain";
import { accountMatchesPrefix } from "$lib/features/prediction/score";
import PredictionRowBadge from "./PredictionRowBadge.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  result?: PredictionResult | null;
  input?: PredictionInput | null;
  accounts?: string[];
  queueIndex?: number | null;
  queueTotal?: number | null;
  similarCount?: number;
  rowPredictions?: PredictionResult[];
  onSelectPrediction?: (result: PredictionResult) => void;
  reviewStatus?: PredictionReviewStatus | null;
  onOverride?: (account: string) => void;
  onApplySimilar?: (account: string) => void;
  onAlwaysUse?: (account: string) => void;
  onConfirmNext?: () => void;
  onClose?: () => void;
}

let {
  result = null,
  input = null,
  accounts = [],
  queueIndex = null,
  queueTotal = null,
  similarCount = undefined,
  rowPredictions = [],
  onSelectPrediction,
  reviewStatus = null,
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

const isResolved = $derived(
  reviewStatus === "ACCEPTED" || reviewStatus === "CORRECTED",
);
</script>

{#if result}
  <div class="paisa-prediction-detail" data-testid="prediction-detail">
    <!-- TOP HEADER -->
    <div class="paisa-prediction-detail-head">
      <div class="paisa-detail-header-left">
        {#if queueIndex != null && queueTotal != null && queueTotal > 0}
          <span class="paisa-queue-badge" data-testid="review-queue-badge">
            Review {queueIndex} of {queueTotal}
          </span>
        {:else}
          <span class="paisa-detail-title">Selected Row Review</span>
        {/if}
        {#if result.merchantKey}
          <span class="paisa-detail-merchant">({result.merchantKey})</span>
        {/if}
      </div>
      <div class="paisa-detail-header-right">
        {#if reviewStatus === "ACCEPTED"}
          <Badge variant="success" size="sm">
            <i class="fas fa-check mr-1 text-[10px]"></i>
            Confirmed
          </Badge>
        {:else if reviewStatus === "CORRECTED"}
          <Badge variant="info" size="sm">
            <i class="fas fa-pen mr-1 text-[10px]"></i>
            Corrected
          </Badge>
        {/if}

        <PredictionRowBadge
          confidence={result.confidence}
          possibleTransfer={result.possibleTransfer}
          resolved={isResolved}
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

    <!-- MULTI-PREDICTION TABS (FOR MULTI-INVOCATION ROWS) -->
    {#if rowPredictions && rowPredictions.length > 1}
      <div class="paisa-prediction-switcher" role="tablist">
        {#each rowPredictions as pred, idx}
          <button
            type="button"
            role="tab"
            class="paisa-switcher-tab"
            class:is-active={pred.helperInvocationIndex === result.helperInvocationIndex}
            onclick={() => onSelectPrediction?.(pred)}
          >
            <span>Account {idx + 1} ({pred.prefix})</span>
            {#if pred.account}
              <span class="paisa-switcher-tab-account">&bull; {pred.account}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <!-- SOURCE TRANSACTION VISIBILITY -->
    {#if input}
      <div class="paisa-source-card" data-testid="source-card">
        <div class="paisa-source-meta-row">
          {#if input.date}
            <span class="paisa-source-date">{input.date}</span>
          {/if}
          {#if input.sourceAccount}
            <span class="paisa-source-account" title="Source Account">
              <i class="fas fa-wallet text-[10px] mr-1 text-[var(--paisa-text-muted)]"></i>
              {input.sourceAccount}
            </span>
          {/if}
          {#if input.prefix}
            <span class="paisa-source-prefix" title="Target Prefix">
              &rarr; {input.prefix}
            </span>
          {/if}
          {#if input.amount != null}
            <span
              class="paisa-source-amount"
              class:is-debit={input.direction === "DEBIT" || input.amount < 0}
            >
              {input.amount} {input.commodity || ""}
            </span>
          {/if}
        </div>
        {#if input.description}
          <div class="paisa-source-desc" title={input.description}>
            {input.description}
          </div>
        {/if}
      </div>
    {/if}

    <!-- SUGGESTED ACCOUNT FIELD -->
    <div class="paisa-detail-field">
      <label class="paisa-detail-label" for="predict-account-select">Suggested Account</label>
      <div class="paisa-select-container" id="predict-account-select">
        <Select
          --list-z-index="50"
          --list-max-height="240px"
          listAutoWidth={false}
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

    <!-- REASONS -->
    {#if (result.reasons || []).length > 0}
      <ul class="paisa-prediction-reasons">
        {#each shortReasons(result.reasons || []) as reason}
          <li>{reason}</li>
        {/each}
      </ul>
    {/if}

    <!-- ALTERNATIVES -->
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

    <!-- ACTION BUTTONS -->
    <div class="paisa-prediction-detail-actions">
      <div class="paisa-action-group-secondary">
        <button
          type="button"
          class="paisa-action-btn"
          disabled={similarCount === 0}
          class:is-disabled={similarCount === 0}
          data-testid="apply-similar-btn"
          onclick={() => onApplySimilar?.(selectedAccount)}
        >
          <span class="inline-flex items-center text-xs"><i class="fas fa-layer-group"></i></span>
          <span>
            {#if similarCount != null && similarCount > 0}
              Apply to {similarCount} similar {similarCount === 1 ? 'row' : 'rows'} in this import
            {:else if similarCount === 0}
              Apply to similar rows in this import (0 found)
            {:else}
              Apply to similar rows in this import
            {/if}
          </span>
        </button>

        <button
          type="button"
          class="paisa-action-btn paisa-action-btn-subtle"
          data-testid="always-use-merchant-btn"
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
          data-testid="confirm-next-btn"
          onclick={() => onConfirmNext?.()}
        >
          <span>{isResolved ? "Next Review" : "Confirm & Next Review"}</span>
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

.paisa-queue-badge {
  display: inline-flex;
  align-items: center;
  background-color: var(--paisa-brand-primary-light, rgba(59, 130, 246, 0.1));
  color: var(--paisa-brand-primary, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.25);
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.45rem;
  border-radius: var(--paisa-radius-full, 9999px);
  letter-spacing: 0.03em;
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

.paisa-prediction-switcher {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  background-color: var(--paisa-surface-muted, #f8fafc);
  border: 1px solid var(--paisa-border-subtle, #e2e8f0);
}

.paisa-switcher-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border: none;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  background: transparent;
  color: var(--paisa-text-secondary, #64748b);
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover {
    color: var(--paisa-text-primary, #0f172a);
    background-color: rgba(0, 0, 0, 0.04);
  }

  &.is-active {
    background-color: var(--paisa-surface-card, #ffffff);
    color: var(--paisa-brand-primary, #3b82f6);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
}

.paisa-switcher-tab-account {
  color: var(--paisa-text-muted, #94a3b8);
  font-weight: normal;
}

.paisa-source-card {
  padding: 0.4rem 0.55rem;
  border-radius: var(--paisa-radius-sm, 0.25rem);
  background-color: var(--paisa-surface-muted, #f8fafc);
  border: 1px solid var(--paisa-border-subtle, #e2e8f0);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.paisa-source-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: var(--paisa-text-secondary, #64748b);
}

.paisa-source-date {
  font-weight: 600;
  color: var(--paisa-text-primary, #0f172a);
}

.paisa-source-account,
.paisa-source-prefix {
  color: var(--paisa-text-secondary, #64748b);
}

.paisa-source-amount {
  margin-left: auto;
  font-weight: 600;
  font-family: var(--paisa-font-mono, monospace);

  &.is-debit {
    color: var(--paisa-negative, #ef4444);
  }
}

.paisa-source-desc {
  font-size: 0.75rem;
  color: var(--paisa-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  margin-top: auto;
  position: sticky;
  bottom: 0;
  background-color: var(--paisa-surface-card, #ffffff);
  padding-top: 0.5rem;
  border-top: 1px solid var(--paisa-border-subtle, #f1f5f9);
  z-index: 20;
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

  &:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover, #f8fafc);
    border-color: var(--paisa-primary, #3b82f6);
  }

  &.is-disabled,
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
