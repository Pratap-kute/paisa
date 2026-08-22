<script lang="ts">
  import Table from "$lib/components/ui/Table.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import { ajax, formatCurrency, type Price } from "$lib/core/utils";
  import { nonZeroPercentageChange } from "$lib/tables/formatters";
  import { toast } from "$lib/core/toast";
  import _ from "lodash";
  import { onMount } from "svelte";
  import type { CellComponent, ColumnDefinition } from "tabulator-tables";
  import type dayjs from "dayjs";

  interface PriceRow {
    commodity_name: string;
    date: dayjs.Dayjs | null;
    value: number | null;
    change_1d: number | null;
    change_1w: number | null;
    change_4w: number | null;
    change_1y: number | null;
    change_3y: number | null;
    change_5y: number | null;
    commodity_type: string;
    commodity_id: string;
    isHistory?: boolean;
    _children?: PriceRow[];
  }

  let prices: Record<string, Price[]> | null = $state(null);
  let commodityFilter = $state("");

  function change(prices: Price[], days: number, tolerance: number) {
    const first = prices[0];
    if (!first) return null;

    const date = first.date.subtract(days, "day");
    const last = _.find(prices, (p) => p.date.isSameOrBefore(date, "day"));
    if (!last) return null;

    const diffDays = first.date.diff(last.date, "day");
    if (Math.abs(diffDays - days) <= tolerance) {
      return (first.value - last.value) / last.value;
    }
    return null;
  }

  function formatPriceDate(cell: CellComponent) {
    const date = cell.getValue() as dayjs.Dayjs | null;
    if (!date) return "";
    return date.format("DD MMM YYYY");
  }

  function formatPriceValue(cell: CellComponent) {
    const value = cell.getValue() as number | null;
    if (value == null) return "";
    return formatCurrency(value, 4);
  }

  function formatHistoryAware(cell: CellComponent, formatter: (cell: CellComponent) => string) {
    const data = cell.getData() as PriceRow;
    if (data.isHistory && !["date", "value"].includes(cell.getField() as string)) {
      return "";
    }
    return formatter(cell);
  }

  const columns: ColumnDefinition[] = [
    {
      title: "Commodity Name",
      field: "commodity_name",
      minWidth: 160,
      widthGrow: 2,
    },
    {
      title: "Last Date",
      field: "date",
      minWidth: 120,
      formatter: (cell) => formatHistoryAware(cell, formatPriceDate),
    },
    {
      title: "Last Price",
      field: "value",
      hozAlign: "right",
      minWidth: 110,
      formatter: (cell) => formatHistoryAware(cell, formatPriceValue),
    },
    {
      title: "1 Day",
      field: "change_1d",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "1 Week",
      field: "change_1w",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "4 Weeks",
      field: "change_4w",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "1 Year",
      field: "change_1y",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "3 Years",
      field: "change_3y",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "5 Years",
      field: "change_5y",
      hozAlign: "right",
      formatter: (cell) => formatHistoryAware(cell, nonZeroPercentageChange),
    },
    {
      title: "Commodity Type",
      field: "commodity_type",
      minWidth: 120,
      formatter: (cell) => formatHistoryAware(cell, (c) => c.getValue() ?? ""),
    },
    {
      title: "Commodity ID",
      field: "commodity_id",
      minWidth: 120,
      formatter: (cell) => formatHistoryAware(cell, (c) => c.getValue() ?? ""),
    },
  ];

  function buildPriceRows(source: Record<string, Price[]>): PriceRow[] {
    return Object.keys(source).map((commodity) => {
      const history = source[commodity];
      const latest = history[0];
      return {
        commodity_name: latest.commodity_name,
        date: latest.date,
        value: latest.value,
        change_1d: change(history, 1, 0),
        change_1w: change(history, 7, 2),
        change_4w: change(history, 28, 4),
        change_1y: change(history, 365, 7),
        change_3y: change(history, 365 * 3, 7),
        change_5y: change(history, 365 * 5, 7),
        commodity_type: latest.commodity_type,
        commodity_id: latest.commodity_id,
        _children: history.slice(1).map((p) => ({
          commodity_name: "",
          date: p.date,
          value: p.value,
          change_1d: null,
          change_1w: null,
          change_4w: null,
          change_1y: null,
          change_3y: null,
          change_5y: null,
          commodity_type: "",
          commodity_id: "",
          isHistory: true,
        })),
      };
    });
  }

  let tableData = $derived.by(() => {
    if (!prices) return [];
    const rows = buildPriceRows(prices);
    const query = commodityFilter.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [row.commodity_name, row.commodity_type, row.commodity_id]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  let commodityCount = $derived(tableData.length);

  async function clearPriceCache() {
    const { success, message } = await ajax("/api/price/delete", { method: "POST" });
    if (!success) {
      toast({
        message: `Failed to clear price cache. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
    } else {
      toast({
        message: "Price cache cleared.",
        type: "is-success"
      });
    }
    await fetchPrice();
  }

  async function fetchPrice() {
    const { prices: loadedPrices } = await ajax("/api/price");
    prices = _.omitBy(loadedPrices, (v) => v.length === 0);
  }

  onMount(async () => {
    await fetchPrice();
  });
</script>

<svelte:head>
  <title>Commodity Prices — Paisa</title>
</svelte:head>

<div class="flex w-full min-w-0 max-w-full flex-col gap-5">
  <PageHeader
    title="Commodity Prices"
    description="Latest prices, historical changes, and market trends"
  />

  <div class="flex w-full min-w-0 flex-col gap-4">
    <div class="flex w-full flex-wrap items-center justify-between gap-3.5 max-md:flex-col max-md:items-stretch max-md:gap-2.5">
      <div class="min-w-0 max-w-full flex-[1_1_280px] max-md:w-full max-md:flex-none">
        <Input
          type="search"
          bind:value={commodityFilter}
          placeholder="Filter by commodity name, type, or ID"
          class="w-full"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 max-md:w-full max-md:flex-col max-md:items-stretch">
        <div class="whitespace-nowrap rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--paisa-muted-foreground)] max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-xs">
          <p class="m-0 inline">
            <b class="text-[var(--paisa-foreground)]">{commodityCount}</b> commodity(ies)
          </p>
        </div>

        <Button variant="danger" size="sm" class="max-md:w-full max-md:justify-center" onclick={clearPriceCache}>
          {#snippet icon()}
            <i class="fas fa-trash-can"></i>
          {/snippet}
          Clear Price Cache
        </Button>
      </div>
    </div>

    {#if prices}
      {#if commodityCount > 0}
        <div class="w-full min-w-0 overflow-hidden rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] shadow-[var(--paisa-shadow-sm)]">
          <Table data={tableData} tree {columns} class="border-0 shadow-none" />
        </div>
      {:else}
        <ZeroState item={[]}>
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paisa-surface-raised)] text-xl text-[var(--paisa-muted-foreground)]">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div class="mb-1 text-[0.9375rem] font-semibold text-[var(--paisa-foreground)]">
            {commodityFilter.trim() ? "No commodities match your filter" : "No price quotes recorded"}
          </div>
          <div class="max-w-[360px] text-[0.8125rem] text-[var(--paisa-muted-foreground)]">
            {commodityFilter.trim()
              ? "Try a different commodity name, type, or ID."
              : "Import ledger files with price directives or sync market prices to populate this view."}
          </div>
        </ZeroState>
      {/if}
    {:else}
      <div class="flex items-center justify-center gap-3 rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] px-6 py-16 text-sm text-[var(--paisa-muted-foreground)]">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paisa-border-strong)] border-t-[var(--paisa-primary)]"></div>
        <span>Loading prices...</span>
      </div>
    {/if}
  </div>
</div>
