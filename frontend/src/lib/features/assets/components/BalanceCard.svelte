<script lang="ts">
import { formatCurrency } from "$lib/shared/formatters/currency";
import { firstName } from "$lib/domain/account";
import type { AssetBreakdown } from "$lib/domain/assets";
import { accountColorStyle } from "$lib/shared/theme/colors";
import { iconText } from "$lib/shared/ui/icon";
import { restName } from "$lib/domain/account";

import Card from "$lib/shared/ui/Card.svelte";

interface Props {
  assetBreakdown: AssetBreakdown;
}

let { assetBreakdown }: Props = $props();
</script>

<Card padding="sm" interactive>
  <div class="my-1 flex items-center justify-between">
    <div class="mr-2 truncate text-muted-foreground custom-icon"
      title={assetBreakdown.group}>
      <span style={accountColorStyle(firstName(assetBreakdown.group))}
      >{iconText(assetBreakdown.group)}</span>
      <a class="text-primary hover:underline"
        href="/assets/gain/{assetBreakdown.group}">
        {restName(restName(assetBreakdown.group))}</a>
    </div>
    <div class="text-base font-bold paisa-nowrap tabular-nums">
      {formatCurrency(assetBreakdown.marketAmount)}
    </div>
  </div>
</Card>
