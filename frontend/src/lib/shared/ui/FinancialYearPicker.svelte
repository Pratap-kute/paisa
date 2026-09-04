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

let { value = $bindable(), dateMin, dateMax, class: className = "" }: Props =
  $props();
</script>

<select
  bind:value
  class="px-2 py-1 text-xs rounded border border-border-subtle bg-surface text-foreground {className}"
>
  {#each forEachFinancialYear(dateMin, dateMax).reverse() as fy}
    <option>{financialYear(fy)}</option>
  {/each}
</select>
