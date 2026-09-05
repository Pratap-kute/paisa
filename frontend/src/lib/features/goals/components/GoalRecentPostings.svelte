<script lang="ts">
import COLORS from "$lib/shared/theme/colors";
import { firstName, restName } from "$lib/domain/account";
import type { Posting } from "$lib/domain/ledger";
import { postingUrl } from "$lib/shared/browser/navigation";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { iconify } from "$lib/shared/ui/icon";
import PostingGroup from "$lib/features/transactions/components/PostingGroup.svelte";
import Section from "$lib/shared/layout/Section.svelte";

interface Props {
  postings: Posting[];
  totalCount: number;
}

let { postings, totalCount }: Props = $props();
</script>

<Section
  title="Recent Postings"
  subtitle={totalCount > postings.length
    ? `Latest ${postings.length} of ${totalCount}`
    : `${totalCount} ${totalCount === 1 ? "posting" : "postings"}`}
>
  {#snippet action()}
    <a
      href="/ledger/posting"
      class="text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
    >View ledger</a>
  {/snippet}

  {#if postings.length > 0}
    <PostingGroup {postings} groupFormat="MMM YYYY">
      {#snippet children({ groupedPostings })}
        <div>
          {#each groupedPostings as posting}
            <a
              class="paisa-posting-row mb-2 flex min-h-[54px] flex-col gap-1 rounded-[var(--paisa-radius-md)] border border-border bg-surface px-3 py-2 text-muted-foreground no-underline transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]"
              href={postingUrl(posting)}
              style="border-left: 2px solid {posting.amount >= 0
                ? posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.tertiary
                  : COLORS.secondary
                : posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.secondary
                  : COLORS.tertiary}"
            >
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span class="min-w-0 truncate text-xs text-muted-foreground">{posting.payee}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{posting.date.format("DD MMM YYYY")}</span>
              </span>
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span class="custom-icon min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {iconify(restName(posting.account), { group: firstName(posting.account) })}
                </span>
                <span class="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrency(posting.amount)}</span>
              </span>
            </a>
          {/each}
        </div>
      {/snippet}
    </PostingGroup>
  {:else}
    <p class="text-sm text-muted-foreground">No postings recorded for this goal.</p>
  {/if}
</Section>
