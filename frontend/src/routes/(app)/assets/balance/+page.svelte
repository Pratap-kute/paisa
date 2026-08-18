<script lang="ts">
  import AssetsBalance from "$lib/components/finance/AssetsBalance.svelte";
  import { ajax, type AssetBreakdown } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";

  let breakdowns: Record<string, AssetBreakdown> = $state({});

  onMount(async () => {
    ({ asset_breakdowns: breakdowns } = await ajax("/api/assets/balance"));
  });
</script>

<Page width="fluid">
  <AssetsBalance {breakdowns} />
</Page>
