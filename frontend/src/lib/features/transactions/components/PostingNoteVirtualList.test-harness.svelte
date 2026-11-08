<script lang="ts">
  import type { Posting } from "#lib/domain/ledger";
  import TooltipProvider from "#lib/shared/ui/TooltipProvider.svelte";
  import VirtualList from "svelte-tiny-virtual-list";
  import PostingNote from "./PostingNote.svelte";

  const allPostings = [
    { note: "Posting note" },
    { note: "Removed note" },
  ] as unknown as Posting[];
  let postings = $state(allPostings);
</script>

<TooltipProvider>
  <button type="button" onclick={() => (postings = [allPostings[0]])}
    >Filter postings</button
  >
  {#key postings}
    <VirtualList
      width="300px"
      height={100}
      itemCount={postings.length}
      itemSize={27}
    >
      {#snippet item({ index, style })}
        {@const posting = postings[index]}
        {#if posting}
          <div {style}>
            <PostingNote {posting} />
          </div>
        {/if}
      {/snippet}
    </VirtualList>
  {/key}
</TooltipProvider>
