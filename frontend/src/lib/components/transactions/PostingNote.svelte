<script lang="ts">
  import { formatTextAsHtml, type Posting } from "$lib/core/utils";
  interface Props {
    posting: Posting;
  }

  let { posting }: Props = $props();
</script>

{#if posting.note != ""}
  <span class="icon is-small" data-tippy-content={formatTextAsHtml(posting.note)}>
    <i class="fa-regular fa-comment-dots"></i>
  </span>
{/if}
