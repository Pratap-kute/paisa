<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  id?: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  class?: string;
  children?: Snippet;
  onchange?: (checked: boolean) => void;
}

let {
  id = `checkbox-${Math.random().toString(36).substring(2, 9)}`,
  name,
  checked = $bindable(false),
  disabled = false,
  label = "",
  description = "",
  class: className = "",
  children,
  onchange,
}: Props = $props();

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement;
  checked = target.checked;
  onchange?.(checked);
}
</script>

<label
  class="inline-flex items-start gap-2 text-sm text-foreground {disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} {className}"
  for={id}
>
  <input
    {id}
    {name}
    type="checkbox"
    bind:checked
    {disabled}
    onchange={handleChange}
    class="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] m-0"
  />
  <div class="min-w-0">
    {#if children}
      {@render children()}
    {:else if label}
      <span class="font-normal">{label}</span>
    {/if}
    {#if description}
      <p class="m-0 mt-0.5 text-xs text-muted-foreground">{description}</p>
    {/if}
  </div>
</label>
