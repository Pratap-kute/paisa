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
    primary: "paisa-badge-primary",
    success: "paisa-badge-success",
    warning: "paisa-badge-warning",
    danger: "paisa-badge-danger",
    info: "paisa-badge-info",
    neutral: "paisa-badge-neutral",
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: "paisa-badge-sm",
    md: "paisa-badge-md",
    lg: "paisa-badge-lg",
  };
</script>

<span
  class="paisa-badge {variantClasses[variant]} {sizeClasses[size]} {rounded ? 'paisa-badge-rounded' : ''} {className}"
>
  {#if dot}
    <span class="paisa-badge-dot paisa-badge-dot-{variant}"></span>
  {/if}
  {@render children?.()}
</span>

<style>
  .paisa-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-family: var(--paisa-font-ui, inherit);
    font-weight: 500;
    border-radius: var(--paisa-radius-sm, 4px);
    line-height: 1;
    white-space: nowrap;
  }

  .paisa-badge-rounded {
    border-radius: var(--paisa-radius-full, 9999px);
  }

  .paisa-badge-sm {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    min-height: 1.35rem;
  }

  .paisa-badge-md {
    font-size: 0.875rem;
    padding: 0.25rem 0.625rem;
    min-height: 1.6rem;
  }

  .paisa-badge-lg {
    font-size: 1rem;
    padding: 0.35rem 0.75rem;
    min-height: 2rem;
  }

  .paisa-badge-primary {
    background-color: var(--paisa-primary-subtle);
    color: var(--paisa-primary);
  }

  .paisa-badge-success {
    background-color: var(--paisa-positive-subtle);
    color: var(--paisa-positive);
  }

  .paisa-badge-warning {
    background-color: var(--paisa-warning-subtle);
    color: var(--paisa-warning);
  }

  .paisa-badge-danger {
    background-color: var(--paisa-negative-subtle);
    color: var(--paisa-negative);
  }

  .paisa-badge-info {
    background-color: var(--paisa-primary-subtle);
    color: var(--paisa-primary);
  }

  .paisa-badge-neutral {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-muted-foreground);
  }

  .paisa-badge-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentColor;
  }

  .paisa-badge-dot-primary {
    background-color: var(--paisa-primary);
  }

  .paisa-badge-dot-success {
    background-color: var(--paisa-positive);
  }

  .paisa-badge-dot-warning {
    background-color: var(--paisa-warning);
  }

  .paisa-badge-dot-danger {
    background-color: var(--paisa-negative);
  }

  .paisa-badge-dot-info {
    background-color: var(--paisa-primary);
  }
</style>
