<script lang="ts">
  import type { RenderMetadata, RenderedRow } from "$lib/importing/spreadsheet";
  import type { Confidence, PredictionResult } from "$lib/prediction/types";
  import { rowMatchesFilter, type ConfidenceFilter } from "$lib/prediction/session";
  import PredictionRowBadge from "$lib/components/prediction/PredictionRowBadge.svelte";
  import _ from "lodash";

  interface Props {
    data: any[][];
    renderMetadata: RenderMetadata;
    predictionRows: Array<{
      rowIndex: number;
      confidence: Confidence;
      possibleTransfer: boolean;
      results: PredictionResult[];
    }>;
    selectedSourceRowIndex: number | null;
    predictionFilter: ConfidenceFilter;
    onSelectRow: (rowIndex: number) => void;
  }

  let {
    data = [],
    renderMetadata,
    predictionRows = [],
    selectedSourceRowIndex = null,
    predictionFilter = null,
    onSelectRow,
  }: Props = $props();

  function summaryForRow(rowIndex: number) {
    return _.find(predictionRows, { rowIndex });
  }

  interface ParsedReviewItem {
    sourceRowIndex: number;
    date: string;
    payee: string;
    narration: string;
    amount: string;
    isDebit: boolean;
    account: string;
    confidence: Confidence | null;
    possibleTransfer: boolean;
    isVisible: boolean;
  }

  function parseRenderedRow(renderedRow: RenderedRow): ParsedReviewItem {
    const rowIndex = renderedRow.sourceRowIndex;
    const summary = summaryForRow(rowIndex);
    const result = summary?.results[0];

    let date = "";
    let payee = "";
    let narration = "";
    let amount = "";
    let isDebit = false;
    let account = result?.account || "";

    const lines = renderedRow.formattedRendered.trim().split("\n");
    const firstLine = lines[0] || "";

    // Extract Date (e.g. 2024/01/06 or 2024-01-06)
    const dateMatch = firstLine.match(/^(\d{4}[-/.]\d{2}[-/.]\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }

    // Extract Payee / Narration (e.g. * "Paid for order" or * Paid for order)
    const quotedMatch = firstLine.match(/"([^"]+)"/) || firstLine.match(/'([^']+)'/);
    if (quotedMatch) {
      payee = quotedMatch[1];
    } else {
      const rest = firstLine.replace(/^(\d{4}[-/.]\d{2}[-/.]\d{2})/, "").replace(/^[\s*!]+/, "").trim();
      if (rest) payee = rest;
    }

    // Extract postings for account and amount
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Extract amount
      if (!amount) {
        const amtMatch = line.match(/(-?[\d,]+(?:\.\d{2})?)/);
        if (amtMatch) {
          amount = amtMatch[1];
          isDebit = amount.startsWith("-");
        }
      }

      // Extract account if not from prediction
      if (!account) {
        const parts = line.split(/\s{2,}|\t/);
        if (parts[0] && !parts[0].includes("Assets:Checking") && !parts[0].includes("Liabilities:CreditCard")) {
          account = parts[0].trim();
        }
      }
    }

    // Fallback if payee or date not found
    if (!payee) {
      const rawRow = data[rowIndex] || [];
      const candidate = _.maxBy(rawRow, (cell) => (typeof cell === "string" ? cell.length : 0));
      payee = candidate ? String(candidate).trim() : `Transaction #${rowIndex + 1}`;
    }

    const isVisible = rowMatchesFilter(summary, predictionFilter);

    return {
      sourceRowIndex: rowIndex,
      date,
      payee,
      narration,
      amount,
      isDebit,
      account,
      confidence: summary?.confidence || null,
      possibleTransfer: summary?.possibleTransfer || false,
      isVisible,
    };
  }

  // Model-backed: Only display rows that participate in generated ledger transactions
  let reviewItems: ParsedReviewItem[] = $derived.by(() => {
    if (renderMetadata && renderMetadata.rows.length > 0) {
      return renderMetadata.rows.map(parseRenderedRow);
    }
    return [];
  });

  let visibleItems = $derived(reviewItems.filter((item) => item.isVisible));
</script>

<div class="paisa-source-review-wrap">
  {#if reviewItems.length === 0}
    <div class="paisa-review-empty">
      <span class="icon is-large has-text-grey-light mb-2">
        <i class="fas fa-file-circle-question fa-2x"></i>
      </span>
      <p class="is-size-6 has-text-weight-semibold">No Transactions Generated</p>
      <p class="is-size-7 has-text-grey mt-1">
        The active template did not match rows in this file. Select a matching template above, or switch to <strong>Raw Data</strong> to view all source rows.
      </p>
    </div>
  {:else if visibleItems.length === 0}
    <div class="paisa-review-empty">
      <span class="icon is-large has-text-grey-light mb-2">
        <i class="fas fa-filter-circle-xmark fa-2x"></i>
      </span>
      <p class="is-size-6 has-text-weight-semibold">No Matching Transactions</p>
      <p class="is-size-7 has-text-grey mt-1">No transactions match the selected prediction filter.</p>
    </div>
  {:else}
    <div class="paisa-review-list" role="list" aria-label="Transaction Review List">
      {#each visibleItems as item (item.sourceRowIndex)}
        <button
          type="button"
          class="paisa-review-card"
          class:is-selected={selectedSourceRowIndex === item.sourceRowIndex}
          onclick={() => onSelectRow(item.sourceRowIndex)}
        >
          <!-- Left Status Indicator Bar -->
          <div
            class="paisa-card-indicator paisa-indicator-{item.confidence?.toLowerCase() || 'unknown'}"
            class:is-transfer={item.possibleTransfer}
          ></div>

          <div class="paisa-card-content">
            <!-- Top Line: Payee on Left, Amount on Right -->
            <div class="paisa-card-row-top">
              <span class="paisa-card-payee" title={item.payee}>{item.payee}</span>
              {#if item.amount}
                <span class="paisa-card-amount" class:is-negative={item.isDebit}>
                  {item.amount}
                </span>
              {/if}
            </div>

            <!-- Bottom Line: Date · Account on Left, Status Badge on Right -->
            <div class="paisa-card-row-bottom">
              <div class="paisa-card-meta">
                {#if item.date}
                  <span class="paisa-card-date">{item.date}</span>
                {/if}
                {#if item.date && item.account}
                  <span class="paisa-card-sep">·</span>
                {/if}
                {#if item.account}
                  <span class="paisa-card-account" title={item.account}>{item.account}</span>
                {/if}
              </div>

              <div class="paisa-card-badge-wrap">
                <PredictionRowBadge
                  confidence={item.confidence}
                  possibleTransfer={item.possibleTransfer}
                />
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .paisa-source-review-wrap {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    background-color: var(--paisa-canvas-bg, #f8fafc);
  }

  .paisa-review-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-6) var(--paisa-space-4);
    text-align: center;
    height: 100%;
    min-height: 240px;
    color: var(--paisa-text-secondary, #64748b);
  }

  .paisa-review-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background-color: var(--paisa-border-subtle, #f1f5f9);
  }

  .paisa-review-card {
    display: flex;
    align-items: stretch;
    width: 100%;
    min-height: 52px;
    padding: 0;
    background-color: var(--paisa-surface-card, #ffffff);
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.12s ease;

    &:hover {
      background-color: var(--paisa-surface-hover, #f8fafc);
    }

    &.is-selected {
      background-color: var(--paisa-brand-primary-light, rgba(59, 130, 246, 0.08));

      .paisa-card-indicator {
        width: 4px;
      }
    }
  }

  .paisa-card-indicator {
    width: 3px;
    flex-shrink: 0;
    transition: width 0.12s ease;

    &-high {
      background-color: var(--paisa-success, #10b981);
    }
    &-medium {
      background-color: var(--paisa-info, #3b82f6);
    }
    &-needs_review {
      background-color: var(--paisa-warning, #f59e0b);
    }
    &-unknown {
      background-color: var(--paisa-danger, #ef4444);
    }
    &.is-transfer {
      background-color: #8b5cf6;
    }
  }

  .paisa-card-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    gap: 0.25rem;
  }

  .paisa-card-row-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
  }

  .paisa-card-payee {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--paisa-text-primary, #0f172a);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .paisa-card-amount {
    font-size: 0.8125rem;
    font-weight: 700;
    font-family: var(--paisa-font-mono, monospace);
    font-variant-numeric: tabular-nums;
    color: var(--paisa-text-primary, #0f172a);
    white-space: nowrap;
    flex-shrink: 0;

    &.is-negative {
      color: var(--paisa-danger, #ef4444);
    }
  }

  .paisa-card-row-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
  }

  .paisa-card-meta {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6875rem;
    color: var(--paisa-text-secondary, #64748b);
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .paisa-card-date {
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .paisa-card-sep {
    color: var(--paisa-text-muted, #94a3b8);
    flex-shrink: 0;
  }

  .paisa-card-account {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--paisa-text-muted, #94a3b8);
  }

  .paisa-card-badge-wrap {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
</style>
