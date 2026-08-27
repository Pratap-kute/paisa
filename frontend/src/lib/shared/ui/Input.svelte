<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLInputAttributes } from "svelte/elements";

type InputType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "search"
  | "tel"
  | "url"
  | "date";
type InputSize = "sm" | "md" | "lg";

interface Props {
  id?: string;
  name?: string;
  autocomplete?: HTMLInputAttributes["autocomplete"];
  type?: InputType;
  value?: string | number;
  placeholder?: string;
  size?: InputSize;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  class?: string;
  prefixIcon?: Snippet;
  suffixIcon?: Snippet;
  oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
  onkeydown?: (e: KeyboardEvent & { currentTarget: HTMLInputElement }) => void;
  onfocus?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
  onblur?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
}

let {
  id,
  name,
  autocomplete,
  type = "text",
  value = $bindable(""),
  placeholder = "",
  size = "sm",
  disabled = false,
  readonly = false,
  required = false,
  class: className = "",
  prefixIcon,
  suffixIcon,
  oninput,
  onchange,
  onkeydown,
  onfocus,
  onblur,
}: Props = $props();

const sizeClasses: Record<InputSize, string> = {
  sm: "paisa-input-sm",
  md: "paisa-input-md",
  lg: "paisa-input-lg",
};
</script>

<div
  class="paisa-input-wrapper {prefixIcon ? 'paisa-input-has-prefix' : ''} {suffixIcon ? 'paisa-input-has-suffix' : ''}">
  <input
    {id}
    {name}
    {autocomplete}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {readonly}
    {required}
    class="paisa-input {sizeClasses[size]} {className}"
    {oninput}
    {onchange}
    {onkeydown}
    {onfocus}
    {onblur}
  />
  {#if prefixIcon}
    <span class="paisa-input-affix paisa-input-affix-prefix">
      {@render prefixIcon()}
    </span>
  {/if}
  {#if suffixIcon}
    <span class="paisa-input-affix paisa-input-affix-suffix">
      {@render suffixIcon()}
    </span>
  {/if}
</div>

<style>
.paisa-input-wrapper {
  position: relative;
  width: 100%;
}

.paisa-input {
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  appearance: none;
  font: inherit;
  background-color: var(--paisa-surface);
  border: 1px solid var(--paisa-border-strong);
  border-radius: var(--paisa-radius-md, 6px);
  color: var(--paisa-foreground);
  box-shadow: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.paisa-input::placeholder {
  color: var(--paisa-muted-foreground);
}

.paisa-input:hover:not(:disabled) {
  border-color: var(--paisa-border);
}

.paisa-input:focus {
  border-color: var(--paisa-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--paisa-primary) 25%,
    transparent);
  outline: none;
}

.paisa-input:disabled {
  background-color: var(--paisa-surface-raised);
  color: var(--paisa-muted-foreground);
  cursor: not-allowed;
}

.paisa-input-sm {
  height: 32px;
  font-size: 0.875rem;
  padding: 0 0.75rem;
}

.paisa-input-md {
  height: 36px;
  font-size: 0.875rem;
  padding: 0 1rem;
}

.paisa-input-lg {
  height: 40px;
  font-size: 1rem;
  padding: 0 1.25rem;
}

.paisa-input-has-prefix .paisa-input {
  padding-left: 2.25rem;
}

.paisa-input-has-suffix .paisa-input {
  padding-right: 2.25rem;
}

.paisa-input-affix {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  color: var(--paisa-muted-foreground);
  pointer-events: none;
  font-size: 0.875rem;
}

.paisa-input-affix-prefix {
  left: 0.75rem;
}

.paisa-input-affix-suffix {
  right: 0.75rem;
}
</style>
