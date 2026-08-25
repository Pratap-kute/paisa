<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
  id?: string;
  checked?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  color?: string;
  children?: Snippet;
  onchange?: (checked: boolean) => void;
}

let {
  id = `switch-${Math.random().toString(36).substring(2, 9)}`,
  checked = $bindable(false),
  disabled = false,
  size = "sm",
  label = "",
  color = "",
  children,
  onchange,
}: Props = $props();

function handleChange(e: Event) {
  const target = e.target as HTMLInputElement;
  checked = target.checked;
  onchange?.(checked);
}
</script>

<div class="paisa-switch-field" style="--paisa-switch-color: {color}">
  <input
    {id}
    type="checkbox"
    class="paisa-switch {size === 'sm' ? 'paisa-switch-sm' : ''}"
    {checked}
    {disabled}
    onchange={handleChange}
  />
  <label for={id}>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </label>
</div>

<style>
.paisa-switch-field {
  display: inline-flex;
  align-items: center;
  margin-bottom: 0;
}

.paisa-switch {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.paisa-switch + label {
  position: relative;
  display: inline-flex;
  height: 2.5em;
  align-items: center;
  padding-left: 3.5rem;
  padding-top: 0.2rem;
  font-size: 1rem;
  line-height: 1.5;
  cursor: pointer;
  color: var(--paisa-foreground);
}

.paisa-switch + label::before {
  position: absolute;
  top: calc(50% - 0.75rem);
  left: 0;
  width: 3rem;
  height: 1.5rem;
  border-radius: var(--paisa-radius-full);
  background: var(--paisa-input-border);
  content: "";
  transition: background var(--paisa-transition-fast, 150ms ease);
}

.paisa-switch + label::after {
  position: absolute;
  top: calc(50% - 0.5rem);
  left: 0.25rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--paisa-surface-bg);
  box-shadow: var(--paisa-shadow-sm);
  content: "";
  transition: transform var(--paisa-transition-fast, 150ms ease);
}

.paisa-switch:checked + label::before {
  background: var(--paisa-switch-color, var(--paisa-primary));
}

.paisa-switch:checked + label::after {
  transform: translateX(1.625rem);
}

.paisa-switch:focus-visible + label::before {
  outline: 2px solid var(--paisa-primary);
  outline-offset: 2px;
}

.paisa-switch:disabled + label {
  cursor: not-allowed;
  opacity: 0.5;
}

.paisa-switch-sm + label {
  height: 2.5em;
  padding-left: 2.75rem;
  padding-top: 0.2rem;
  font-size: 0.75rem;
}

.paisa-switch-sm + label::before {
  top: calc(50% - 0.5625rem);
  width: 2.25rem;
  height: 1.125rem;
}

.paisa-switch-sm + label::after {
  top: calc(50% - 0.375rem);
  left: 0.1875rem;
  width: 0.75rem;
  height: 0.75rem;
}

.paisa-switch-sm:checked + label::after {
  transform: translateX(1.125rem);
}
</style>
