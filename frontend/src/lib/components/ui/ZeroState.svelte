<script lang="ts">
  import _ from "lodash";

  interface Props {
    item: any;
    children?: import('svelte').Snippet;
  }

  let { item, children }: Props = $props();
</script>

{#if item == null || item == false || (item != true && _.isEmpty(item))}
  <div class="has-text-centered p-6">
    {@render children?.()}
  </div>
{/if}
