<script lang="ts">
import type { AssetBreakdown } from "$lib/domain/assets";
import { restName } from "$lib/domain/account";
import { formatCurrency } from "$lib/shared/formatters/currency";

interface Props {
  accounts: AssetBreakdown[];
}
let { accounts }: Props = $props();
</script>

{#if accounts.length > 0}
  <section
  class="rounded-xl p-4 sm:p-5 bg-surface border border-border-subtle shadow-xs"
  data-testid="dashboard-cash-accounts">
  <div class="flex items-center justify-between mb-3">
    <span
      class="text-sm font-semibold uppercase tracking-wider text-foreground">Cash Accounts</span>
    <a href="/assets/balance"
      class="text-xs font-semibold text-primary uppercase tracking-wider hover:underline">View All</a>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each accounts as account (account.group)}
        {@const name = restName(restName(account.group)) || restName(account.group) || account.group}
        <a href={`/assets/gain/${encodeURIComponent(account.group)}`} class="flex items-center justify-between p-3 rounded-lg bg-surface-raised hover:bg-surface-hover border border-border-subtle transition-colors min-w-0" data-testid="dashboard-cash-account">
          <span class="text-sm font-medium text-foreground truncate pr-3" title={account.group}>{name}</span>
          <span class="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{formatCurrency(account.marketAmount)}</span>
        </a>
      {/each}
    </div>
</section>
{/if}
