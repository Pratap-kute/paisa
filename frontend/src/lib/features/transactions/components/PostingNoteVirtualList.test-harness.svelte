<script lang="ts">
import type { Posting } from "$lib/domain/ledger";
import TooltipProvider from "$lib/shared/ui/TooltipProvider.svelte";
import VirtualList from "svelte-tiny-virtual-list";
import PostingNote from "./PostingNote.svelte";

const postings = [
  { note: "Posting note" },
  { note: null },
] as unknown as Posting[];
</script>

<TooltipProvider>
  <VirtualList width="300px" height={100} itemCount={postings.length}
    itemSize={27}>
    <svelte:fragment slot="item" let:index let:style>
      <div {style}>
        <PostingNote posting={postings[index]} />
      </div>
    </svelte:fragment>
  </VirtualList>
</TooltipProvider>
