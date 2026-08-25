<script lang="ts">
import { Tooltip as BitsTooltip } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  children?: Snippet;
}

let { children }: Props = $props();
</script>

<BitsTooltip.Provider delayDuration={0} skipDelayDuration={300}>
  {@render children?.()}
</BitsTooltip.Provider>
