<script lang="ts">
  import _ from "lodash";

  interface Props {
    item: any;
    children?: import('svelte').Snippet;
  }

  let { item, children }: Props = $props();
</script>

{#if item == null || item == false || (item != true && _.isEmpty(item))}
  <div class="paisa-zero-state">
    {@render children?.()}
  </div>
{/if}

<style>
  .paisa-zero-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-6, 2rem);
    text-align: center;
  }
</style>
