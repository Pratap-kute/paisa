<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import { iconText } from "$lib/core/icon";
  import { restName, type AssetBreakdown, formatCurrency, firstName } from "$lib/core/utils";

  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    assetBreakdown: AssetBreakdown;
  }

  let { assetBreakdown }: Props = $props();
</script>

<Card padding="sm">
  <div class="my-1 is-flex is-justify-content-space-between">
    <div class="has-text-grey paisa-truncate custom-icon" title={assetBreakdown.group}>
      <span style={accountColorStyle(firstName(assetBreakdown.group))}
        >{iconText(assetBreakdown.group)}</span
      >
      <a class="secondary-link" href="/assets/gain/{assetBreakdown.group}">
        {restName(restName(assetBreakdown.group))}</a
      >
    </div>
    <div class="has-text-weight-bold is-size-6">
      {formatCurrency(assetBreakdown.marketAmount)}
    </div>
  </div>
</Card>
