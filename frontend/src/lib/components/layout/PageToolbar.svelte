<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    class?: string;
    start?: Snippet;
    end?: Snippet;
    children?: Snippet;
  }

  let {
    class: className = "",
    start,
    end,
    children,
  }: Props = $props();
</script>

<div class="paisa-page-toolbar {className}">
  <div class="paisa-toolbar-start">
    {#if start}
      {@render start()}
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>

  {#if end}
    <div class="paisa-toolbar-end">
      {@render end()}
    </div>
  {/if}
</div>

<style lang="scss">
  .paisa-page-toolbar {
    width: 100%;
    margin-bottom: var(--paisa-space-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-3);
  }

  .paisa-toolbar-start,
  .paisa-toolbar-end {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
  }
</style>
