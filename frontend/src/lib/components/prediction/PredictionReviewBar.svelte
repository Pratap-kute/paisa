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
    class="tag is-success is-light is-small"
    class:is-active={filter === "HIGH"}
    onclick={() => toggle("HIGH")}
  >
    High {counts.high}
  </button>
  <button
    type="button"
    class="tag is-info is-light is-small"
    class:is-active={filter === "MEDIUM"}
    onclick={() => toggle("MEDIUM")}
  >
    Medium {counts.medium}
  </button>
  <button
    type="button"
    class="tag is-warning is-light is-small"
    class:is-active={filter === "NEEDS_REVIEW"}
    onclick={() => toggle("NEEDS_REVIEW")}
  >
    Review {counts.review}
  </button>
  <button
    type="button"
    class="tag is-danger is-light is-small"
    class:is-active={filter === "UNKNOWN"}
    onclick={() => toggle("UNKNOWN")}
  >
    Unknown {counts.unknown}
  </button>
  <button
    type="button"
    class="tag is-warning is-light is-small"
    class:is-active={filter === "TRANSFER"}
    onclick={() => toggle("TRANSFER")}
  >
    Transfers {counts.transfer}
  </button>
</div>

<style lang="scss">
  .paisa-prediction-review-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--paisa-space-1);
  }

  button.tag {
    border: 1px solid transparent;
    cursor: pointer;

    &.is-active {
      border-color: var(--paisa-brand-primary);
      box-shadow: inset 0 0 0 1px var(--paisa-brand-primary);
    }
  }
</style>
