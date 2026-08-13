<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import { iconText } from "$lib/core/icon";
  import { restName, type AssetBreakdown, formatCurrency, firstName } from "$lib/core/utils";

  export let assetBreakdown: AssetBreakdown;
</script>

<div class="box p-3 has-background-white">
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
</div>
