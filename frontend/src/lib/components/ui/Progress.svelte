<script lang="ts">
  import { formatPercentage } from "$lib/core/utils";
  import { dropRight, range } from "es-toolkit";
import { floor } from "$lib/core/collection";
  interface Props {
    small?: boolean;
    progressPercent: number;
    showPercent?: boolean;
  }

  let { small = false, progressPercent, showPercent = true }: Props = $props();

  let computed = $derived.by(() => {
    let rawTimes = range(0, floor(progressPercent / 100));
    let rawRemainder = progressPercent % 100;
    if (rawRemainder === 0) {
      rawTimes = dropRight(rawTimes, 1);
      rawRemainder = progressPercent === 0 ? 0 : 100;
    }
    return { times: rawTimes, remainder: rawRemainder };
  });

  let times = $derived(computed.times);
  let remainder = $derived(computed.remainder);
</script>

<div>
  {#each times as _t}
    <div class="relative mb-1">
      <progress class="paisa-progress {small ? 'paisa-progress-xs' : 'paisa-progress-sm'}" value={100} max="100"
      ></progress>
    </div>
  {/each}

  <div class="relative">
    <progress
      class="paisa-progress mb-1 {small ? 'paisa-progress-sm' : 'paisa-progress-lg'}"
      value={remainder}
      max="100"
    ></progress>
    {#if small && showPercent}
      <span class="text-sm font-semibold text-[var(--paisa-foreground)]"
        >{formatPercentage(progressPercent / 100, 2)}</span
      >
    {/if}

    {#if !small && showPercent}
      <span
        class="progress-percent absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--paisa-foreground)] {remainder < 10 ? 'less-than-10' : ''}"
        style={remainder > 10 ? `right: ${100 - remainder}%;` : `left: ${remainder}%;`}
        >{formatPercentage(progressPercent / 100, 2)}</span
      >
    {/if}
  </div>
</div>

<style>
  .paisa-progress {
    display: block;
    width: 100%;
    height: 0.5rem;
    appearance: none;
    border: 0;
    border-radius: var(--paisa-radius-full);
    overflow: hidden;
    background-color: var(--paisa-border-subtle);
  }

  .paisa-progress-xs {
    height: 0.25rem;
  }

  .paisa-progress-sm {
    height: 0.375rem;
  }

  .paisa-progress-lg {
    height: 0.625rem;
  }

  .paisa-progress::-webkit-progress-bar {
    background-color: var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-full);
  }

  .paisa-progress::-webkit-progress-value {
    background-color: var(--paisa-positive);
    border-radius: var(--paisa-radius-full);
  }

  .paisa-progress::-moz-progress-bar {
    background-color: var(--paisa-positive);
    border-radius: var(--paisa-radius-full);
  }

  .progress-percent.less-than-10 {
    left: 0.5rem;
    right: auto;
  }
</style>
