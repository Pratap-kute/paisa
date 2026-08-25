<script lang="ts">
import { DropdownMenu } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  disabled?: boolean;
  textValue?: string;
  class?: string;
  onselect?: (event: Event) => void;
  children?: Snippet;
}

let {
  disabled = false,
  textValue,
  class: className = "",
  onselect,
  children,
}: Props = $props();
</script>

<DropdownMenu.Item
  {disabled}
  {textValue}
  onSelect={onselect}
  class="paisa-dropdown-item flex cursor-default select-none items-center px-3 py-2 text-sm text-[var(--paisa-foreground)] outline-none data-[highlighted]:bg-[var(--paisa-surface-hover)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 {className}"
>
  {@render children?.()}
</DropdownMenu.Item>
