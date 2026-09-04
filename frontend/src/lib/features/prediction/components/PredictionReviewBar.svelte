<script lang="ts">
import type { ConfidenceFilter } from "$lib/features/prediction/session";
import type { PredictionReviewProgress } from "$lib/features/prediction/types";

interface Props {
  counts: {
    high: number;
    medium: number;
    review: number;
    unknown: number;
    transfer: number;
  };
  filter: ConfidenceFilter;
  progress?: PredictionReviewProgress | null;
  onFilter: (filter: ConfidenceFilter) => void;
  onReviewNext?: () => void;
}

let {
  counts,
  filter,
  progress = null,
  onFilter,
  onReviewNext,
}: Props = $props();

function toggle(next: ConfidenceFilter) {
  onFilter(filter === next ? null : next);
}
</script>

<div class="paisa-prediction-review-bar" data-testid="prediction-review-bar">
  <div class="paisa-chips-group">
    <button
      type="button"
      class="paisa-review-chip"
      class:is-active={filter === "HIGH"}
      onclick={() => toggle("HIGH")}
    >
      <span class="paisa-chip-dot paisa-chip-dot-high"></span>
      <span>High {counts.high}</span>
    </button>
    <button
      type="button"
      class="paisa-review-chip"
      class:is-active={filter === "MEDIUM"}
      onclick={() => toggle("MEDIUM")}
    >
      <span class="paisa-chip-dot paisa-chip-dot-medium"></span>
      <span>Medium {counts.medium}</span>
    </button>
    <button
      type="button"
      class="paisa-review-chip"
      class:is-active={filter === "NEEDS_REVIEW"}
      onclick={() => toggle("NEEDS_REVIEW")}
    >
      <span class="paisa-chip-dot paisa-chip-dot-review"></span>
      <span>Review {counts.review}</span>
    </button>
    <button
      type="button"
      class="paisa-review-chip"
      class:is-active={filter === "UNKNOWN"}
      onclick={() => toggle("UNKNOWN")}
    >
      <span class="paisa-chip-dot paisa-chip-dot-unknown"></span>
      <span>Unknown {counts.unknown}</span>
    </button>
    {#if counts.transfer > 0 || filter === "TRANSFER"}
      <button
        type="button"
        class="paisa-review-chip"
        class:is-active={filter === "TRANSFER"}
        onclick={() => toggle("TRANSFER")}
      >
        <span class="paisa-chip-dot paisa-chip-dot-transfer"></span>
        <span>Transfers {counts.transfer}</span>
      </button>
    {/if}
  </div>

  {#if progress && progress.total > 0}
    <div class="paisa-progress-section" data-testid="review-progress-section">
      {#if progress.remaining > 0}
        <div class="paisa-progress-meta">
          <span class="paisa-progress-text">
            <strong>{progress.reviewed}</strong>/{progress.total} reviewed
          </span>
          <div class="paisa-progress-bar-container" title="{progress.percent}% reviewed">
            <div class="paisa-progress-bar-fill" style:width="{progress.percent}%"></div>
          </div>
        </div>
        {#if onReviewNext}
          <button
            type="button"
            class="paisa-review-next-action-btn"
            data-testid="review-next-btn"
            onclick={() => onReviewNext?.()}
          >
            <span>Review Next</span>
            <i class="fas fa-arrow-right text-[10px]"></i>
          </button>
        {/if}
      {:else}
        <div class="paisa-all-reviewed-badge" data-testid="all-reviewed-badge">
          <i class="fas fa-check-circle"></i>
          <span>All reviewed</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
.paisa-prediction-review-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.625rem;
  width: 100%;
  flex-wrap: wrap;
}

.paisa-chips-group {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

button.paisa-review-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  min-height: 24px;
  border-radius: var(--paisa-radius-full, 9999px);
  border: 1px solid var(--paisa-border-subtle);
  background-color: var(--paisa-surface);
  color: var(--paisa-muted-foreground);
  cursor: pointer;
  transition: all 0.12s ease;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-foreground);
    border-color: var(--paisa-border);
  }

  &.is-active {
    background-color: var(--paisa-primary-subtle);
    border-color: var(--paisa-primary);
    color: var(--paisa-primary);
    font-weight: 600;
    box-shadow: 0 0 0 1px var(--paisa-primary);
  }
}

.paisa-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.paisa-chip-dot-high {
  background-color: var(--paisa-prediction-high);
}

.paisa-chip-dot-medium {
  background-color: var(--paisa-prediction-medium);
}

.paisa-chip-dot-review {
  background-color: var(--paisa-prediction-review);
}

.paisa-chip-dot-unknown {
  background-color: var(--paisa-prediction-unknown);
}

.paisa-chip-dot-transfer {
  background-color: var(--paisa-prediction-transfer);
}

.paisa-progress-section {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
}

.paisa-progress-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.paisa-progress-text {
  font-size: 0.6875rem;
  color: var(--paisa-muted-foreground);
  white-space: nowrap;

  strong {
    color: var(--paisa-foreground);
  }
}

.paisa-progress-bar-container {
  width: 54px;
  height: 6px;
  border-radius: 3px;
  background-color: var(--paisa-surface-hover);
  overflow: hidden;
  position: relative;
}

.paisa-progress-bar-fill {
  height: 100%;
  background-color: var(--paisa-primary);
  border-radius: 3px;
  transition: width 0.25s ease;
}

.paisa-review-next-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  min-height: 24px;
  border-radius: var(--paisa-radius-sm, 4px);
  background-color: var(--paisa-primary);
  color: var(--paisa-inverse-foreground, #ffffff);
  border: none;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;

  &:hover {
    filter: brightness(1.08);
  }

  &:active {
    transform: scale(0.98);
  }
}

.paisa-all-reviewed-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--paisa-positive);
  background-color: var(--paisa-positive-subtle);
  padding: 0.2rem 0.5rem;
  border-radius: var(--paisa-radius-full, 9999px);
  white-space: nowrap;
}
</style>
