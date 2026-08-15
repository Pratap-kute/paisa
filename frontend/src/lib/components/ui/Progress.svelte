<script lang="ts">
  import { formatPercentage } from "$lib/core/utils";
  import { dropRight, floor, range } from "lodash";

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
    <div style="position: relative;" class="mb-1">
      <progress
        class="progress is-success {small ? 'is-extra-small' : 'is-small'}"
        value={100}
        max="100">{100}%</progress
      >
    </div>
  {/each}

  <div style="position: relative;">
    <progress
      class="progress is-success mb-1 {small ? 'is-small' : 'is-large'}"
      value={remainder}
      max="100">{remainder}%</progress
    >
    {#if small && showPercent}
      <span class="has-text-weight-bold">{formatPercentage(progressPercent / 100, 2)}</span>
    {/if}

    {#if !small && showPercent}
      <span
        class="has-text-weight-bold progress-percent {remainder < 10 && 'less-than-10'}"
        style={remainder > 10 ? `right: ${100 - remainder}%;` : `left: ${remainder}%;`}
        >{formatPercentage(progressPercent / 100, 2)}</span
      >
    {/if}
  </div>
</div>
