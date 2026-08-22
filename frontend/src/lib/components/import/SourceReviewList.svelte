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

    const dateMatch = firstLine.match(/^(\d{4}[-/.]\d{2}[-/.]\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
    }

    const quotedMatch = firstLine.match(/"([^"]+)"/) || firstLine.match(/'([^']+)'/);
    if (quotedMatch) {
      payee = quotedMatch[1];
    } else {
      const rest = firstLine.replace(/^(\d{4}[-/.]\d{2}[-/.]\d{2})/, "").replace(/^[\s*!]+/, "").trim();
      if (rest) payee = rest;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (!amount) {
        const amtMatch = line.match(/(-?[\d,]+(?:\.\d{2})?)/);
        if (amtMatch) {
          amount = amtMatch[1];
          isDebit = amount.startsWith("-");
        }
      }

      if (!account) {
        const parts = line.split(/\s{2,}|\t/);
        if (parts[0] && !parts[0].includes("Assets:Checking") && !parts[0].includes("Liabilities:CreditCard")) {
          account = parts[0].trim();
        }
      }
    }

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

  let reviewItems: ParsedReviewItem[] = $derived.by(() => {
    if (renderMetadata && renderMetadata.rows.length > 0) {
      return renderMetadata.rows.map(parseRenderedRow);
    }
    return [];
  });

  let visibleItems = $derived(reviewItems.filter((item) => item.isVisible));

  function indicatorClass(confidence: Confidence | null, possibleTransfer: boolean) {
    if (possibleTransfer) return "bg-violet-500";
    switch (confidence) {
      case "HIGH":
        return "bg-[var(--paisa-success)]";
      case "MEDIUM":
        return "bg-[var(--paisa-info)]";
      case "NEEDS_REVIEW":
        return "bg-[var(--paisa-warning)]";
      default:
        return "bg-[var(--paisa-danger)]";
    }
  }
</script>

<div class="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[var(--paisa-canvas-bg)]">
  {#if reviewItems.length === 0}
    <div class="flex h-full min-h-[240px] flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-center text-[var(--paisa-text-secondary)]">
      <i class="fas fa-file-circle-question mb-2 text-3xl text-[var(--paisa-text-muted)]"></i>
      <p class="text-base font-semibold text-[var(--paisa-text-primary)]">No Transactions Generated</p>
      <p class="mt-1 text-xs text-[var(--paisa-text-secondary)]">
        The active template did not match rows in this file. Select a matching template above, or switch to <strong>Raw Data</strong> to view all source rows.
      </p>
    </div>
  {:else if visibleItems.length === 0}
    <div class="flex h-full min-h-[240px] flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-center text-[var(--paisa-text-secondary)]">
      <i class="fas fa-filter-circle-xmark mb-2 text-3xl text-[var(--paisa-text-muted)]"></i>
      <p class="text-base font-semibold text-[var(--paisa-text-primary)]">No Matching Transactions</p>
      <p class="mt-1 text-xs text-[var(--paisa-text-secondary)]">No transactions match the selected prediction filter.</p>
    </div>
  {:else}
    <div class="flex flex-col gap-px bg-[var(--paisa-border-subtle)]" role="list" aria-label="Transaction Review List">
      {#each visibleItems as item (item.sourceRowIndex)}
        <button
          type="button"
          class="flex w-full min-h-[52px] cursor-pointer items-stretch border-0 bg-[var(--paisa-surface-card)] p-0 text-left transition-colors hover:bg-[var(--paisa-surface-hover)] {selectedSourceRowIndex === item.sourceRowIndex ? 'bg-[var(--paisa-brand-primary-light)]' : ''}"
          onclick={() => onSelectRow(item.sourceRowIndex)}
        >
          <div
            class="shrink-0 transition-[width] duration-150 {indicatorClass(item.confidence, item.possibleTransfer)} {selectedSourceRowIndex === item.sourceRowIndex ? 'w-1' : 'w-[3px]'}"
          ></div>

          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
            <div class="flex min-w-0 items-baseline justify-between gap-2">
              <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-[var(--paisa-text-primary)]" title={item.payee}>{item.payee}</span>
              {#if item.amount}
                <span class="shrink-0 whitespace-nowrap font-mono text-[0.8125rem] font-bold tabular-nums {item.isDebit ? 'text-[var(--paisa-danger)]' : 'text-[var(--paisa-text-primary)]'}">
                  {item.amount}
                </span>
              {/if}
            </div>

            <div class="flex min-w-0 items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[0.6875rem] text-[var(--paisa-text-secondary)]">
                {#if item.date}
                  <span class="shrink-0 tabular-nums">{item.date}</span>
                {/if}
                {#if item.date && item.account}
                  <span class="shrink-0 text-[var(--paisa-text-muted)]">·</span>
                {/if}
                {#if item.account}
                  <span class="truncate text-[var(--paisa-text-muted)]" title={item.account}>{item.account}</span>
                {/if}
              </div>

              <div class="flex shrink-0 items-center">
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
