<script lang="ts">
import type dayjs from "dayjs";
import BoxedTabs from "./BoxedTabs.svelte";
import { isMobile } from "$lib/shared/browser/responsive";

interface Props {
  value: number;
  dateMin: dayjs.Dayjs;
  dateMax: dayjs.Dayjs;
}

let { value = $bindable(), dateMin, dateMax }: Props = $props();

let options: { label: string; value: number }[] = $derived.by(() => {
  const list = [{ label: "All", value: -1 }];
  if (!dateMax || !dateMin) return list;
  const diff = dateMax.diff(dateMin, "year");
  if (diff >= 10 && !isMobile()) {
    list.push({ label: "10 years", value: 10 });
  }

  if (diff >= 5 && !isMobile()) {
    list.push({ label: "5 years", value: 5 });
  }

  if (diff >= 3) {
    list.push({ label: "3 years", value: 3 });
  }

  if (diff >= 1) {
    list.push({ label: "1 year", value: 1 });
  }
  return list;
});
</script>

{#if options.length > 1}
  <BoxedTabs bind:value {options} />
{/if}
