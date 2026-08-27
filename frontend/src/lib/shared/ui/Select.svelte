<script lang="ts">
import type { Snippet } from "svelte";

type SelectSize = "sm" | "md" | "lg";

interface OptionItem {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface Props {
  id?: string;
  name?: string;
  value?: string | number;
  options?: OptionItem[];
  size?: SelectSize;
  disabled?: boolean;
  required?: boolean;
  fullwidth?: boolean;
  class?: string;
  icon?: Snippet;
  children?: Snippet;
  onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
}

let {
  id,
  name,
  value = $bindable(""),
  options = [],
  size = "sm",
  disabled = false,
  required = false,
  fullwidth = false,
  class: className = "",
  icon,
  children,
  onchange,
}: Props = $props();

const sizeClasses: Record<SelectSize, string> = {
  sm: "paisa-select-sm",
  md: "paisa-select-md",
  lg: "paisa-select-lg",
};
</script>

<div
  class="paisa-select-wrapper {icon ? 'paisa-select-has-icon' : ''} {fullwidth ? 'w-full' : ''}">
  <select
    {id}
    {name}
    bind:value
    {disabled}
    {required}
    class="paisa-select {sizeClasses[size]} {className}"
    {onchange}
  >
    {#if children}
      {@render children()}
    {:else if options}
      {#each options as opt}
        <option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
      {/each}
    {/if}
  </select>
  {#if icon}
    <span class="paisa-select-icon">
      {@render icon()}
    </span>
  {/if}
</div>

<style>
.paisa-select-wrapper {
  position: relative;
  display: inline-block;
}

.paisa-select {
  appearance: none;
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  font: inherit;
  background-color: var(--paisa-surface);
  border: 1px solid var(--paisa-border-strong);
  border-radius: var(--paisa-radius-md, 6px);
  color: var(--paisa-foreground);
  padding-right: 2rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.paisa-select:focus {
  border-color: var(--paisa-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--paisa-primary) 25%,
    transparent);
  outline: none;
}

.paisa-select:disabled {
  background-color: var(--paisa-surface-raised);
  color: var(--paisa-muted-foreground);
  cursor: not-allowed;
}

.paisa-select-sm {
  height: 32px;
  font-size: 0.875rem;
  padding: 0 2rem 0 0.75rem;
}

.paisa-select-md {
  height: 36px;
  font-size: 0.875rem;
  padding: 0 2rem 0 1rem;
}

.paisa-select-lg {
  height: 40px;
  font-size: 1rem;
  padding: 0 2rem 0 1.25rem;
}

.paisa-select-has-icon .paisa-select {
  padding-left: 2.25rem;
}

.paisa-select-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  color: var(--paisa-muted-foreground);
  pointer-events: none;
  font-size: 0.875rem;
}
</style>
