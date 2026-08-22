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

<Card padding="sm" interactive>
  <div class="my-1 flex items-center justify-between">
    <div class="mr-2 truncate text-[var(--paisa-muted-foreground)] custom-icon" title={assetBreakdown.group}>
      <span style={accountColorStyle(firstName(assetBreakdown.group))}
        >{iconText(assetBreakdown.group)}</span
      >
      <a class="text-[var(--paisa-primary)] hover:underline" href="/assets/gain/{assetBreakdown.group}">
        {restName(restName(assetBreakdown.group))}</a
      >
    </div>
    <div class="text-base font-bold paisa-nowrap tabular-nums">
      {formatCurrency(assetBreakdown.marketAmount)}
    </div>
  </div>
</Card>
