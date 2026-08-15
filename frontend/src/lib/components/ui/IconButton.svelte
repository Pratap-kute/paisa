<script lang="ts">
  import type { Snippet } from "svelte";

  type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
  type ButtonSize = "xs" | "sm" | "md" | "lg";

  interface Props {
    type?: "button" | "submit" | "reset";
    variant?: ButtonVariant;
    size?: ButtonSize;
    rounded?: boolean;
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    ariaLabel: string;
    title?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    type = "button",
    variant = "ghost",
    size = "sm",
    rounded = false,
    disabled = false,
    loading = false,
    class: className = "",
    ariaLabel,
    title,
    onclick,
    children,
  }: Props = $props();

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "is-link",
    secondary: "is-light is-link invertable",
    ghost: "is-ghost",
    danger: "is-danger",
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
  class="button {variantClasses[variant]} {sizeClasses[size]} {rounded ? 'is-rounded' : ''} {loading ? 'is-loading' : ''} {className}"
  disabled={disabled || loading}
  aria-label={ariaLabel}
  title={title || ariaLabel}
  {onclick}
>
  <span class="icon is-small">
    {@render children?.()}
  </span>
</button>
