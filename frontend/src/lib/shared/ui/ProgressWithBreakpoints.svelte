<script lang="ts">
  import Progress from "$lib/shared/ui/Progress.svelte";
  import { formatCurrencyCrude, type Point } from "$lib/core/utils";
  import { range } from "es-toolkit";
  interface Props {
    progressPercent: number;
    breakPoints: Point[];
  }

  let { progressPercent, breakPoints }: Props = $props();

  let spacers = $derived(range(breakPoints.length, 4));
</script>

<div>
  {#if breakPoints.length > 0}
    <div class="paisa-breakpoints-row">
      <div></div>
      {#each breakPoints as point, i}
        <div class="paisa-breakpoint-card">
          <div class="paisa-breakpoint-date">
            {point.date.format("DD MMM YYYY")}
          </div>
          <div class="paisa-breakpoint-body">
            <div class="paisa-breakpoint-check">
              <span
                class="paisa-breakpoint-icon {progressPercent >= (i + 1) * 25
                  ? 'paisa-breakpoint-icon-complete'
                  : 'paisa-breakpoint-icon-pending'}"
              >
                <i class="fas fa-check-circle" aria-hidden="true"></i>
              </span>
            </div>
            <div>{(i + 1) * 25}%</div>
            <div class="paisa-breakpoint-value">
              {formatCurrencyCrude(point.value)}
            </div>
          </div>
        </div>
      {/each}
      {#each spacers as _s}
        <div></div>
      {/each}
    </div>
  {/if}
  <Progress {progressPercent} />
</div>

<style>
  .paisa-breakpoints-row {
    display: flex;
    justify-content: space-between;
    gap: var(--paisa-space-2, 0.5rem);
  }

  .paisa-breakpoint-card {
    display: none;
    margin-bottom: var(--paisa-space-3, 0.75rem);
    padding: var(--paisa-space-1, 0.25rem) var(--paisa-space-4, 1rem);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md, 6px);
    background-color: var(--paisa-surface);
    text-align: center;
    box-shadow: var(--paisa-shadow-sm);
  }

  @media screen and (min-width: 769px) {
    .paisa-breakpoint-card {
      display: block;
    }
  }

  .paisa-breakpoint-date {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--paisa-muted-foreground);
  }

  .paisa-breakpoint-body {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: center;
    gap: var(--paisa-space-2, 0.5rem);
  }

  .paisa-breakpoint-check {
    margin-right: var(--paisa-space-1, 0.25rem);
  }

  .paisa-breakpoint-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.875rem;
  }

  .paisa-breakpoint-icon-complete {
    color: var(--paisa-positive);
  }

  .paisa-breakpoint-icon-pending {
    color: var(--paisa-muted-foreground);
  }

  .paisa-breakpoint-value {
    margin-left: var(--paisa-space-1, 0.25rem);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--paisa-muted-foreground);
  }
</style>
