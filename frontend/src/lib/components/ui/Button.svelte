<script lang="ts">
  import type { Snippet } from "svelte";

  type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link" | "outline";
  type ButtonSize = "xs" | "sm" | "md" | "lg";

  interface Props {
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    ariaLabel?: string;
    title?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    icon?: Snippet;
  }

  let {
    type = "button",
    variant = "secondary",
    size = "sm",
    disabled = false,
    loading = false,
    class: className = "",
    ariaLabel,
    title,
    onclick,
    children,
    icon,
  }: Props = $props();

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "is-link",
    secondary: "is-light is-link invertable",
    ghost: "is-ghost",
    danger: "is-danger",
    link: "is-text",
    outline: "is-outlined",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    xs: "is-small p-1",
    sm: "is-small",
    md: "is-normal",
    lg: "is-medium",
  };
</script>

<button
  {type}
  class="button {variantClasses[variant]} {sizeClasses[size]} {loading ? 'is-loading' : ''} {className}"
  disabled={disabled || loading}
  aria-label={ariaLabel}
  {title}
  {onclick}
>
  {#if icon}
    <span class="icon is-small">
      {@render icon()}
    </span>
  {/if}
  {#if children}
    <span>
      {@render children()}
    </span>
  {/if}
</button>
