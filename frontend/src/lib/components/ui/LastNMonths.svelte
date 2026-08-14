<script lang="ts">
  import _ from "lodash";
  import BoxedTabs from "./BoxedTabs.svelte";
  import { now } from "$lib/core/utils";

  let currentMonth = now();
  interface Props {
    n?: number;
    value?: string;
  }

  let { n = 2, value = $bindable(currentMonth.format("YYYY-MM")) }: Props = $props();

  let options: { label: string; value: string }[] = $derived(
    _.reverse(
      _.map(_.range(0, n), (i) => {
        let month = currentMonth.subtract(i, "month");
        return {
          label: month.format("MMMM"),
          value: month.format("YYYY-MM")
        };
      })
    )
  );
</script>

<BoxedTabs bind:value {options} />
