<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  children?: Snippet;
  class?: string;
}

let { children, class: className = "" }: Props = $props();
</script>

<div class="paisa4-filter-bar {className}">
  {@render children?.()}
</div>
