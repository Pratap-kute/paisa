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
    sm: "is-small",
    md: "is-normal",
    lg: "is-medium",
  };
</script>

<div class="control {prefixIcon ? 'has-icons-left' : ''} {suffixIcon ? 'has-icons-right' : ''}">
  <input
    {id}
    {name}
    {type}
    bind:value
    {placeholder}
    {disabled}
    {readonly}
    {required}
    class="input {sizeClasses[size]} {className}"
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
