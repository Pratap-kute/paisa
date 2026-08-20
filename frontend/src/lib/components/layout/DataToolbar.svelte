<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label?: string;
    count?: string;
    search?: Snippet;
    filters?: Snippet;
    actions?: Snippet;
    class?: string;
  }

  let {
    label,
    count,
    search,
    filters,
    actions,
    class: className = "",
  }: Props = $props();
</script>

<div class="paisa4-data-toolbar {className}">
  {#if label || count}
    <div class="paisa4-toolbar-title">
      {#if label}<span>{label}</span>{/if}
      {#if count}<span class="paisa4-toolbar-count">{count}</span>{/if}
    </div>
  {/if}
  {#if search}
    <div class="paisa4-toolbar-search">{@render search()}</div>
  {/if}
  {#if filters}
    <div class="paisa4-toolbar-filters">{@render filters()}</div>
  {/if}
  {#if actions}
    <div class="paisa4-toolbar-actions">{@render actions()}</div>
  {/if}
</div>

