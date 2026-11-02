<script lang="ts">
  import type dayjs from "dayjs";
  import { financialYear, resolveFinancialYear } from "#lib/domain/time";
  import { forEachFinancialYear } from "#lib/shared/formatters/date";

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

  // The shared year starts empty and the range changes once a page has loaded
  // its data, so keep the selection within it (latest by default).
  $effect(() => {
    const next = resolveFinancialYear(value, years);
    if (next !== value) value = next;
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
