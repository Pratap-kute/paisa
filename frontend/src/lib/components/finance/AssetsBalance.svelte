<script lang="ts">
  import { type AssetBreakdown, buildTree } from "$lib/core/utils";
  import { onMount } from "svelte";
  import Table from "$lib/components/ui/Table.svelte";
  import type { ColumnDefinition } from "tabulator-tables";
  import {
    accountName,
    formatCurrencyChange,
    indendedAssetAccountName,
    nonZeroCurrency,
    nonZeroFloatChange,
    nonZeroPercentageChange,
  } from "$lib/tables/formatters";

  interface Props {
    breakdowns: Record<string, AssetBreakdown>;
    indent?: boolean;
    compact?: boolean;
  }

  let { breakdowns, indent = true, compact: compactProp }: Props = $props();

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

  let columns: ColumnDefinition[] = $derived([
    {
      title: "Account",
      field: "group",
      formatter: indent ? indendedAssetAccountName : accountName,
      minWidth: 220,
      widthGrow: 2,
      frozen: true,
    },
    {
      title: "Investment Amount",
      field: "investmentAmount",
      hozAlign: "right",
      vertAlign: "middle",
      formatter: nonZeroCurrency,
      cssClass: "paisa-tabular-nums",
    },
    {
      title: "Withdrawal Amount",
      field: "withdrawalAmount",
      hozAlign: "right",
      formatter: nonZeroCurrency,
      cssClass: "paisa-tabular-nums",
      visible: !compact,
    },
    {
      title: "Balance Units",
      field: "balanceUnits",
      hozAlign: "right",
      formatter: nonZeroCurrency,
      cssClass: "paisa-tabular-nums",
      visible: !compact,
    },
    {
      title: "Market Value",
      field: "marketAmount",
      hozAlign: "right",
      formatter: nonZeroCurrency,
      cssClass: "paisa-tabular-nums",
    },
    {
      title: "Change",
      field: "gainAmount",
      hozAlign: "right",
      formatter: formatCurrencyChange,
      cssClass: "paisa-tabular-nums",
    },
    {
      title: "XIRR",
      field: "xirr",
      hozAlign: "right",
      formatter: nonZeroFloatChange,
      cssClass: "paisa-tabular-nums",
      visible: !compact,
    },
    {
      title: "Absolute Return",
      field: "absoluteReturn",
      hozAlign: "right",
      formatter: nonZeroPercentageChange,
      cssClass: "paisa-tabular-nums",
      visible: !compact,
    },
  ]);

  let tree: AssetBreakdown[] = $derived(
    breakdowns ? buildTree(Object.values(breakdowns), (i) => i.group) : [],
  );
</script>

{#if indent}
  <Table data={tree} tree {columns} />
{:else}
  <Table data={Object.values(breakdowns || {})} {columns} />
{/if}
