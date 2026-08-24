<script lang="ts">
  import type dayjs from "dayjs";
  import { financialYear, forEachFinancialYear } from "$lib/core/utils";

  interface Props {
    value: string;
    dateMin: dayjs.Dayjs;
    dateMax: dayjs.Dayjs;
    class?: string;
  }

  let { value = $bindable(), dateMin, dateMax, class: className = "" }: Props = $props();
</script>

<select
  bind:value
  class="px-2 py-1 text-xs rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] text-[var(--paisa-foreground)] {className}"
>
  {#each forEachFinancialYear(dateMin, dateMax).reverse() as fy}
    <option>{financialYear(fy)}</option>
  {/each}
</select>
