<script lang="ts">
  import type { Snippet } from "svelte";

  type InputType = "text" | "password" | "email" | "number" | "search" | "tel" | "url" | "date";
  type InputSize = "sm" | "md" | "lg";

  interface Props {
    id?: string;
    name?: string;
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

<div class="control paisa-input-wrapper {prefixIcon ? 'has-icons-left' : ''} {suffixIcon ? 'has-icons-right' : ''}">
  <input
    {id}
    {name}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {readonly}
    {required}
    class="input paisa-input {sizeClasses[size]} {className}"
    {oninput}
    {onchange}
    {onkeydown}
    {onfocus}
    {onblur}
  />
  {#if prefixIcon}
    <span class="icon is-small is-left">
      {@render prefixIcon()}
    </span>
  {/if}
  {#if suffixIcon}
    <span class="icon is-small is-right">
      {@render suffixIcon()}
    </span>
  {/if}
</div>

<style lang="scss">
  .paisa-input-wrapper {
    width: 100%;
  }

  .paisa-input {
    width: 100%;
    font-family: var(--paisa-font-sans);
    background-color: var(--paisa-input-bg);
    border: 1px solid var(--paisa-input-border);
    border-radius: var(--paisa-radius-md);
    color: var(--paisa-input-text);
    box-shadow: none;
    transition: border-color var(--paisa-transition-fast), box-shadow var(--paisa-transition-fast);

    &::placeholder {
      color: var(--paisa-input-placeholder);
    }

    &:hover:not(:disabled) {
      border-color: var(--paisa-input-border-hover);
    }

    &:focus {
      border-color: var(--paisa-input-border-focus);
      box-shadow: var(--paisa-focus-ring);
      outline: none;
    }

    &:disabled {
      background-color: var(--paisa-input-disabled-bg);
      color: var(--paisa-input-disabled-text);
      cursor: not-allowed;
    }
  }

  .paisa-input-sm {
    height: 32px;
    font-size: var(--paisa-font-size-sm);
    padding: 0 var(--paisa-space-3);
  }

  .paisa-input-md {
    height: 36px;
    font-size: var(--paisa-font-size-sm);
    padding: 0 var(--paisa-space-4);
  }

  .paisa-input-lg {
    height: 40px;
    font-size: var(--paisa-font-size-base);
    padding: 0 var(--paisa-space-5);
  }
</style>
