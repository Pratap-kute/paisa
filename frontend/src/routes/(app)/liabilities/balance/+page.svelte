<script lang="ts">
  import Table from "$lib/components/ui/Table.svelte";
  import {
    indendedLiabilityAccountName,
    nonZeroCurrency,
    nonZeroFloatChange
  } from "$lib/tables/formatters";
  import { ajax, buildTree, type LiabilityBreakdown } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import type { ColumnDefinition } from "tabulator-tables";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let breakdowns: LiabilityBreakdown[] = $state([]);
  let isEmpty = $state(false);

  onMount(async () => {
    ({ liability_breakdowns: breakdowns } = await ajax("/api/liabilities/balance"));

    if (_.isEmpty(breakdowns)) {
      isEmpty = true;
    }
  });

  const columns: ColumnDefinition[] = [
    {
      title: "Account",
      field: "group",
      formatter: indendedLiabilityAccountName,
      minWidth: 220,
      widthGrow: 2,
      frozen: true
    },
    {
      title: "Drawn Amount",
      field: "drawn_amount",
      hozAlign: "right",
      vertAlign: "middle",
      formatter: nonZeroCurrency
    },
    {
      title: "Repaid Amount",
      field: "repaid_amount",
      hozAlign: "right",
      formatter: nonZeroCurrency
    },
    {
      title: "Balance Amount",
      field: "balance_amount",
      hozAlign: "right",
      formatter: nonZeroCurrency
    },
    {
      title: "Interest",
      field: "interest_amount",
      hozAlign: "right",
      formatter: nonZeroCurrency
    },
    { title: "APR", field: "apr", hozAlign: "right", formatter: nonZeroFloatChange }
  ];

  let tree: LiabilityBreakdown[] = $derived(
    breakdowns ? buildTree(Object.values(breakdowns), (i) => i.group) : []
  );
</script>

<Page width="fluid">
  <PageHeader
    title="Liabilities Balance"
    description="Outstanding debts, loans, and credit lines"
  />

  {#if isEmpty}
    <Section>
      <article class="message">
        <div class="message-body">
          <strong>Hurray!</strong> You have no liabilities.
        </div>
      </article>
    </Section>
  {:else}
    <Section>
      <Table data={tree} tree {columns} />
    </Section>
  {/if}
</Page>
