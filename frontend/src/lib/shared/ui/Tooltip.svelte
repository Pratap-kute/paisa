<script lang="ts">
import { Tooltip as BitsTooltip } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  content?: string | null;
  class?: string;
  side?: "top" | "right" | "bottom" | "left";
  children?: Snippet<[Record<string, unknown>]>;
}

let {
  content,
  class: className = "",
  side = "top",
  children,
}: Props = $props();
</script>

{#if content}
  <BitsTooltip.Root>
  <BitsTooltip.Trigger>
      {#snippet child({ props })}
        {@render children?.(props)}
      {/snippet}
    </BitsTooltip.Trigger>
  <BitsTooltip.Portal>
    <BitsTooltip.Content
      role="tooltip"
      {side}
      sideOffset={6}
      collisionPadding={8}
      class="paisa-tooltip-content {className}"
    >
        {@html content}
        <BitsTooltip.Arrow class="paisa-tooltip-arrow" />
      </BitsTooltip.Content>
  </BitsTooltip.Portal>
</BitsTooltip.Root>
{:else}
  {@render children?.({})}
{/if}
