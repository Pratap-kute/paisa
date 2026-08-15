<script lang="ts">
  import type { Snippet } from "svelte";

  type BadgeVariant = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  type BadgeSize = "sm" | "md" | "lg";

  interface Props {
    variant?: BadgeVariant;
    size?: BadgeSize;
    rounded?: boolean;
    dot?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = "neutral",
    size = "sm",
    rounded = false,
    dot = false,
    class: className = "",
    children,
  }: Props = $props();

  const variantClasses: Record<BadgeVariant, string> = {
    primary: "is-link is-light invertable",
    success: "is-success is-light",
    warning: "is-warning is-light",
    danger: "is-danger is-light",
    info: "is-info is-light",
    neutral: "is-light",
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: "is-small",
    md: "is-normal",
    lg: "is-medium",
  };
</script>

<span
  class="tag {variantClasses[variant]} {sizeClasses[size]} {rounded ? 'is-rounded' : ''} {className}"
>
  {#if dot}
    <span class="paisa-badge-dot mr-1" class:dot-success={variant === 'success'} class:dot-danger={variant === 'danger'} class:dot-warning={variant === 'warning'} class:dot-primary={variant === 'primary'}></span>
  {/if}
  {@render children?.()}
</span>

<style>
  .paisa-badge-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }
</style>
