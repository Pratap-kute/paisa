<script lang="ts">
import type { Posting } from "$lib/domain/ledger";
import { formatCurrency } from "$lib/shared/formatters/currency";

interface Props {
  postings: Posting[];
  groupFormat: string;
  children?: import("svelte").Snippet<[any]>;
}

let { postings, groupFormat, children }: Props = $props();

interface GroupedPosting {
  key: string;
  postings: Posting[];
  total: number;
}

function group(ps: Posting[]) {
  let groupedPostings: GroupedPosting[] = [];
  let lastGroup: string;
  for (const posting of ps) {
    const group = posting.date.format(groupFormat);
    if (group !== lastGroup) {
      groupedPostings.push({
        key: group,
        postings: [],
        total: 0,
      });
      lastGroup = group;
    }

    groupedPostings[groupedPostings.length - 1].postings.push(posting);
    let amount = posting.amount;
    if (posting.account.startsWith("Income:CapitalGains")) {
      amount = -amount;
    }
    groupedPostings[groupedPostings.length - 1].total += amount;
  }

  if (ps.length == 100) {
    groupedPostings.pop();
  }

  return groupedPostings;
}

let groupedPostings: GroupedPosting[] = $derived(group(postings));
let isGrouped = $derived(
  groupedPostings.some((groupedPosting) => groupedPosting.postings.length > 1),
);
</script>

<div class="space-y-4">
  {#each groupedPostings as groupedPosting}
    <section>
      {#if isGrouped}
        <div
          class="mb-2 flex items-baseline justify-between gap-3 border-b border-border-subtle pb-1 text-sm font-bold text-muted-foreground"
        >
          <div>{groupedPosting.key}</div>
          <div>{formatCurrency(groupedPosting.total)}</div>
        </div>
      {/if}
      {@render children?.({ groupedPostings: groupedPosting.postings, })}
    </section>
  {/each}
</div>
