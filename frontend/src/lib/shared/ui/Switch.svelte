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

<div class="paisa-switch-field"
  style={color ? `--paisa-switch-color: ${color}` : undefined}>
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
  min-height: 1.5rem;
  align-items: center;
  padding-left: 3rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  cursor: pointer;
  color: var(--paisa-foreground, var(--paisa-foreground));
  user-select: none;
}

.paisa-switch + label::before {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0;
  width: 2.5rem;
  height: 1.375rem;
  border-radius: var(--paisa-radius-full, 9999px);
  background: var(--paisa-border-strong, #475569);
  content: "";
  transition: background var(--paisa-transition-fast, 150ms ease);
}

.paisa-switch + label::after {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0.1875rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.35);
  content: "";
  transition: transform var(--paisa-transition-fast, 150ms ease), background
    var(--paisa-transition-fast, 150ms ease);
}

.paisa-switch:checked + label::before {
  background: var(--paisa-switch-color, var(--paisa-primary, #3b82f6));
}

.paisa-switch:checked + label::after {
  transform: translateY(-50%) translateX(1.125rem);
}

.paisa-switch:focus-visible + label::before {
  outline: 2px solid var(--paisa-primary, #3b82f6);
  outline-offset: 2px;
}

.paisa-switch:disabled + label {
  cursor: not-allowed;
  opacity: 0.5;
}

.paisa-switch-sm + label {
  min-height: 1.25rem;
  padding-left: 2.375rem;
  font-size: 0.75rem;
}

.paisa-switch-sm + label::before {
  width: 2rem;
  height: 1.125rem;
}

.paisa-switch-sm + label::after {
  left: 0.125rem;
  width: 0.875rem;
  height: 0.875rem;
}

.paisa-switch-sm:checked + label::after {
  transform: translateY(-50%) translateX(0.875rem);
}
</style>
