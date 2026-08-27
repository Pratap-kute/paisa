<script lang="ts">
interface Props {
  item: any;
  children?: import("svelte").Snippet;
}

let { item, children }: Props = $props();

let shouldShow = $derived(
  item === null ||
    item === undefined ||
    item === false ||
    (typeof item === "string" && item.trim().length === 0) ||
    (Array.isArray(item) && item.length === 0) ||
    (typeof item === "object" && item !== null &&
      Object.keys(item).length === 0),
);
</script>

{#if shouldShow}
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
