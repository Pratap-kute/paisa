<script lang="ts">
  interface Props {
    toggle?: import('svelte').Snippet<[any]>;
    content?: import('svelte').Snippet;
  }

  let { toggle, content }: Props = $props();
  let active = $state(false);
  let onclick = function (_e: any) {
    active = !active;
  };
</script>

{@render toggle?.({ active, onclick, })}
{#if active}
  {@render content?.()}
{/if}
