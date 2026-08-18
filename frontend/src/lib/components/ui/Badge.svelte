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
    primary: "is-link is-light invertable paisa-badge-primary",
    success: "is-success is-light paisa-badge-success",
    warning: "is-warning is-light paisa-badge-warning",
    danger: "is-danger is-light paisa-badge-danger",
    info: "is-info is-light paisa-badge-info",
    neutral: "is-light paisa-badge-neutral",
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: "is-small paisa-badge-sm",
    md: "is-normal paisa-badge-md",
    lg: "is-medium paisa-badge-lg",
  };
</script>

<span
  class="tag paisa-badge {variantClasses[variant]} {sizeClasses[size]} {rounded ? 'is-rounded' : ''} {className}"
>
  {#if dot}
    <span
      class="paisa-badge-dot mr-1"
      class:dot-success={variant === "success"}
      class:dot-danger={variant === "danger"}
      class:dot-warning={variant === "warning"}
      class:dot-primary={variant === "primary"}
      class:dot-info={variant === "info"}
    ></span>
  {/if}
  {@render children?.()}
</span>

<style lang="scss">
  .paisa-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--paisa-font-sans);
    font-weight: var(--paisa-font-weight-medium);
    border-radius: var(--paisa-radius-sm);
    line-height: 1;
    white-space: nowrap;

    &.is-rounded {
      border-radius: var(--paisa-radius-full);
    }
  }

  /* Sizes */
  .paisa-badge-sm {
    font-size: var(--paisa-font-size-xs);
    padding: 0.2rem 0.5rem;
    height: 1.35rem;
  }

  .paisa-badge-md {
    font-size: var(--paisa-font-size-sm);
    padding: 0.25rem 0.625rem;
    height: 1.6rem;
  }

  .paisa-badge-lg {
    font-size: var(--paisa-font-size-base);
    padding: 0.35rem 0.75rem;
    height: 2rem;
  }

  /* Variants */
  .paisa-badge-primary {
    background-color: var(--paisa-brand-primary-light);
    color: var(--paisa-brand-primary);
  }

  .paisa-badge-success {
    background-color: var(--paisa-success-light);
    color: var(--paisa-success);
  }

  .paisa-badge-warning {
    background-color: var(--paisa-warning-light);
    color: var(--paisa-warning);
  }

  .paisa-badge-danger {
    background-color: var(--paisa-danger-light);
    color: var(--paisa-danger);
  }

  .paisa-badge-info {
    background-color: var(--paisa-info-light);
    color: var(--paisa-info);
  }

  .paisa-badge-neutral {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-text-secondary);
  }

  .paisa-badge-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;

    &.dot-primary { background-color: var(--paisa-brand-primary); }
    &.dot-success { background-color: var(--paisa-success); }
    &.dot-warning { background-color: var(--paisa-warning); }
    &.dot-danger { background-color: var(--paisa-danger); }
    &.dot-info { background-color: var(--paisa-info); }
  }
</style>
