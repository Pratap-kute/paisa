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

<div class="paisa-page-toolbar mb-4 is-flex is-justify-content-space-between is-align-items-center is-flex-wrap-wrap gap-2 {className}">
  <div class="paisa-toolbar-start is-flex is-align-items-center is-flex-wrap-wrap gap-2">
    {#if start}
      {@render start()}
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>

  {#if end}
    <div class="paisa-toolbar-end is-flex is-align-items-center is-flex-wrap-wrap gap-2">
      {@render end()}
    </div>
  {/if}
</div>

<style>
  .paisa-page-toolbar {
    width: 100%;
  }
</style>
