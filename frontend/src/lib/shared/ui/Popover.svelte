<script lang="ts">
import { Popover as BitsPopover } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  open?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  trigger: Snippet;
  children?: Snippet<[{ close: () => void }]>;
}

let {
  open = $bindable(false),
  side = "bottom",
  trigger,
  children,
}: Props = $props();

function close() {
  open = false;
}
</script>

<BitsPopover.Root bind:open>
  <BitsPopover.Trigger class="paisa4-trigger-reset">
    {@render trigger()}
  </BitsPopover.Trigger>
  <BitsPopover.Portal>
    <BitsPopover.Content {side} sideOffset={8} class="paisa4-popover">
      {@render children?.({ close })}
    </BitsPopover.Content>
  </BitsPopover.Portal>
</BitsPopover.Root>
