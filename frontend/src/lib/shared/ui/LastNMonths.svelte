<script lang="ts">
import BoxedTabs from "./BoxedTabs.svelte";
import { now } from "$lib/domain/time";

let currentMonth = now();
interface Props {
  n?: number;
  value?: string;
}

let { n = 2, value = $bindable(currentMonth.format("YYYY-MM")) }: Props =
  $props();

let options: { label: string; value: string }[] = $derived(
  Array.from({ length: n }, (_, i) => {
    let month = currentMonth.subtract(i, "month");
    return {
      label: month.format("MMMM"),
      value: month.format("YYYY-MM"),
    };
  }).reverse(),
);
</script>

<BoxedTabs bind:value {options} />
