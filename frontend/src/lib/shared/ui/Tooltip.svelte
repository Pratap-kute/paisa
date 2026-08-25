<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  content: string;
  class?: string;
  children?: Snippet;
}

let {
  content,
  class: className = "",
  children,
}: Props = $props();
</script>

<span class="paisa-tooltip-wrapper {className}" data-tippy-content={content}>
  {@render children?.()}
</span>

<style>
.paisa-tooltip-wrapper {
  display: inline-flex;
  align-items: center;
}
</style>
