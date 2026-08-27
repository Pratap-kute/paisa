<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  left?: Snippet;
  right?: Snippet;
  children?: Snippet;
}

let { left, right, children }: Props = $props();
</script>

<footer class="paisa4-status-bar">
  <div>{#if left}{@render left()}{:else}{@render children?.()}{/if}</div>
  {#if right}<div>{@render right()}</div>{/if}
</footer>
