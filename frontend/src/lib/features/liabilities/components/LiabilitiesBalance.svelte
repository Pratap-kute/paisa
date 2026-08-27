<script lang="ts">
import type { LiabilityBreakdown } from "$lib/domain/liabilities";
import { buildTree } from "$lib/shared/utils/tree";
import { onMount } from "svelte";
import Table from "$lib/shared/ui/Table.svelte";
import {
  indendedLiabilityAccountName,
  nonZeroCurrency,
  nonZeroFloatChange,
} from "$lib/shared/tables/formatters";

interface Props {
  breakdowns: LiabilityBreakdown[];
  compact?: boolean;
}

let { breakdowns, compact: compactProp }: Props = $props();

let compactView = $state(false);
let compact = $derived(compactProp ?? compactView);

onMount(() => {
  if (compactProp !== undefined) return;
  const mq = globalThis.matchMedia("(max-width: 767px)");
  const update = () => {
    compactView = mq.matches;
  };
  update();
  mq.addEventListener("change", update);
  return () => mq.removeEventListener("change", update);
});

let columns = $derived([
  {
    title: "Account",
    field: "group",
    formatter: indendedLiabilityAccountName,
    minWidth: 220,
    widthGrow: 2,
    frozen: true,
  },
  {
    title: "Drawn Amount",
    field: "drawn_amount",
    hozAlign: "right",
    vertAlign: "middle",
    formatter: nonZeroCurrency,
    cssClass: "paisa-tabular-nums",
  },
  {
    title: "Repaid Amount",
    field: "repaid_amount",
    hozAlign: "right",
    formatter: nonZeroCurrency,
    cssClass: "paisa-tabular-nums",
    visible: !compact,
  },
  {
    title: "Balance Amount",
    field: "balance_amount",
    hozAlign: "right",
    formatter: nonZeroCurrency,
    cssClass: "paisa-tabular-nums",
  },
  {
    title: "Interest",
    field: "interest_amount",
    hozAlign: "right",
    formatter: nonZeroCurrency,
    cssClass: "paisa-tabular-nums",
  },
  {
    title: "APR",
    field: "apr",
    hozAlign: "right",
    formatter: nonZeroFloatChange,
    cssClass: "paisa-tabular-nums",
    visible: !compact,
  },
]);

let tree: LiabilityBreakdown[] = $derived(
  breakdowns ? buildTree(Object.values(breakdowns), (i) => i.group) : [],
);
</script>

<Table data={tree} tree {columns} />
