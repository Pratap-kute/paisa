<script lang="ts">
import Tooltip from "./Tooltip.svelte";
import TooltipProvider from "./TooltipProvider.svelte";

interface Props {
  content?: string | null;
}
let { content }: Props = $props();
</script>

<TooltipProvider>
  <Tooltip {content}>
    {#snippet children(props)}
      <button {...props} type="button">Tooltip trigger</button>
    {/snippet}
  </Tooltip>
</TooltipProvider>
