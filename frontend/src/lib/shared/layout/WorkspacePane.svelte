<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  title?: string;
  actions?: Snippet;
  children?: Snippet;
  class?: string;
}

let { title, actions, children, class: className = "" }: Props = $props();
</script>

<section class="paisa4-workspace-pane {className}">
  {#if title || actions}
    <div class="paisa4-workspace-pane-header">
      {#if title}<h2>{title}</h2>{/if}
      {#if actions}<div>{@render actions()}</div>{/if}
    </div>
  {/if}
  <div class="paisa4-workspace-pane-body">
    {@render children?.()}
  </div>
</section>
