<script lang="ts">
  import type { ConfidenceFilter } from "$lib/prediction/session";

  interface Props {
    counts: {
      high: number;
      medium: number;
      review: number;
      unknown: number;
      transfer: number;
    };
    filter: ConfidenceFilter;
    onFilter: (filter: ConfidenceFilter) => void;
  }

  let { counts, filter, onFilter }: Props = $props();

  function toggle(next: ConfidenceFilter) {
    onFilter(filter === next ? null : next);
  }
</script>

<div class="paisa-prediction-review-bar" data-testid="prediction-review-bar">
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

<style lang="scss">
  .paisa-prediction-review-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    overflow-x: auto;
    max-width: 100%;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
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
    background-color: var(--paisa-surface-card);
    color: var(--paisa-text-secondary);
    cursor: pointer;
    transition: all 0.12s ease;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-text-primary);
      border-color: var(--paisa-border-default);
    }

    &.is-active {
      background-color: var(--paisa-brand-primary-light, rgba(59, 130, 246, 0.12));
      border-color: var(--paisa-brand-primary, #3b82f6);
      color: var(--paisa-brand-primary, #3b82f6);
      font-weight: 600;
      box-shadow: 0 0 0 1px var(--paisa-brand-primary, #3b82f6);
    }
  }

  .paisa-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;

    &-high {
      background-color: var(--paisa-success, #10b981);
    }
    &-medium {
      background-color: var(--paisa-info, #3b82f6);
    }
    &-review {
      background-color: var(--paisa-warning, #f59e0b);
    }
    &-unknown {
      background-color: var(--paisa-danger, #ef4444);
    }
    &-transfer {
      background-color: #8b5cf6;
    }
  }
</style>
