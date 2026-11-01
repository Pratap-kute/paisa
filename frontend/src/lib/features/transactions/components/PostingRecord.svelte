<script lang="ts">
  import type { Posting } from "$lib/domain/ledger";
  import { firstName } from "$lib/domain/account";
  import { change } from "$lib/domain/posting";
  import { postingUrl } from "$lib/shared/browser/navigation";
  import { formatCurrency, formatFloat } from "$lib/shared/formatters/currency";
  import { accountColorStyle } from "$lib/shared/theme/colors";
  import { iconText } from "$lib/shared/ui/icon";
  import PostingNote from "./PostingNote.svelte";
  import PostingStatus from "./PostingStatus.svelte";

  interface Props {
    posting: Posting;
    style?: string;
  }

  let { posting: p, style = "" }: Props = $props();

  let hasUnits = $derived(p.commodity !== USER_CONFIG.default_currency);
  let c = $derived(change(p));
</script>

<!-- Phone layout of a posting: one record per row instead of a ten column grid. -->
<div
  class="flex flex-col justify-center gap-0.5 border-b border-border-subtle px-3 py-1.5"
  {style}
>
  <div class="flex items-baseline justify-between gap-3">
    <span class="text-xs tabular-nums text-muted-foreground">
      {p.date.format("DD MMM YYYY")}
    </span>
    <span class="text-sm font-semibold tabular-nums text-foreground">
      {formatCurrency(p.amount, 2)}
    </span>
  </div>

  <div class="truncate text-sm font-medium text-foreground" title={p.payee}>
    <PostingStatus posting={p} />
    <PostingNote posting={p} />
    <a class="secondary-link" href={postingUrl(p)}>{p.payee}</a>
  </div>

  <div
    class="flex items-baseline justify-between gap-3 text-[0.8125rem] text-muted-foreground"
  >
    <span class="custom-icon min-w-0 truncate text-foreground" title={p.account}>
      <span class="mr-1" style={accountColorStyle(firstName(p.account))}
        >{iconText(p.account)}</span
      >{p.account}
    </span>
    <span class="shrink-0 tabular-nums">{formatCurrency(p.balance, 2)}</span>
  </div>

  {#if hasUnits}
    <div
      class="flex items-baseline justify-between gap-3 text-xs tabular-nums text-muted-foreground"
    >
      <span class="truncate">
        {formatFloat(p.quantity, 4)} @ {formatCurrency(
          Math.abs(p.amount / p.quantity),
          4,
        )}
      </span>
      {#if c.days > 0 && c.value !== 0}
        <span class="shrink-0">
          {formatCurrency(p.market_amount)}
          <span class={c.class}>({formatFloat(c.percentage)}%)</span>
        </span>
      {/if}
    </div>
  {/if}
</div>
