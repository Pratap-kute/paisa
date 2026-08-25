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

<div>
  {#each groupedPostings as groupedPosting}
    <div class={isGrouped && "mb-3"}>
      {#if isGrouped}
        <div
          class="flex justify-between paisa-negative-mb-1 text-sm font-bold text-[var(--paisa-muted-foreground)]"
        >
          <div>{groupedPosting.key}</div>
          <div>{formatCurrency(groupedPosting.total)}</div>
        </div>
      {/if}
      {@render children?.({ groupedPostings: groupedPosting.postings, })}
    </div>
  {/each}
</div>
