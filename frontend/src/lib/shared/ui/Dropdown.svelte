<script lang="ts">
import { DropdownMenu } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  open?: boolean;
  align?: "left" | "right";
  class?: string;
  trigger?: Snippet<[Record<string, unknown>, { open: boolean }]>;
  children?: Snippet;
}

let {
  open = $bindable(false),
  align = "left",
  class: className = "",
  trigger,
  children,
}: Props = $props();
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      {@render trigger?.(props, { open })}
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      align={align === "right" ? "end" : "start"}
      sideOffset={4}
      collisionPadding={8}
      loop
      class="paisa-dropdown-content z-50 min-w-48 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-dropdown-border)] bg-[var(--paisa-dropdown-bg)] py-1 shadow-[var(--paisa-dropdown-shadow)] {className}"
    >
      {@render children?.()}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
