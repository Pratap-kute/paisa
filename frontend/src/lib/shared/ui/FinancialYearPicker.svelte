<script lang="ts">
  import type dayjs from "dayjs";
  import { financialYear } from "$lib/domain/time";
  import { forEachFinancialYear } from "$lib/shared/formatters/date";

  interface Props {
    value: string;
    dateMin: dayjs.Dayjs;
    dateMax: dayjs.Dayjs;
    class?: string;
  }

  let {
    value = $bindable(),
    dateMin,
    dateMax,
    class: className = "",
  }: Props = $props();

  let years = $derived(
    forEachFinancialYear(dateMin, dateMax).reverse().map(financialYear),
  );

  // The shared year store starts empty, so pages opened directly would
  // otherwise render a blank selection.
  $effect(() => {
    if (!value && years.length > 0) {
      value = years[0];
    }
  });
</script>

<select
  bind:value
  class="px-2 py-1 text-xs rounded border border-border-subtle bg-surface text-foreground {className}"
>
  {#each years as fy}
    <option>{fy}</option>
  {/each}
</select>
