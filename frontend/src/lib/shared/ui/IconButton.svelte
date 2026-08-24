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
    primary: "paisa-icon-button-primary",
    secondary: "paisa-icon-button-secondary",
    ghost: "paisa-icon-button-ghost",
    danger: "paisa-icon-button-danger",
    outline: "paisa-icon-button-outline",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    xs: "paisa-icon-button-xs",
    sm: "paisa-icon-button-sm",
    md: "paisa-icon-button-md",
    lg: "paisa-icon-button-lg",
  };
</script>

<button
  {type}
  class="paisa-icon-button {variantClasses[variant]} {sizeClasses[size]} {rounded ? 'paisa-icon-button-rounded' : ''} {loading ? 'paisa-icon-button-loading' : ''} {className}"
  disabled={disabled || loading}
  aria-label={ariaLabel}
  aria-busy={loading || undefined}
  title={title || ariaLabel}
  {onclick}
>
  {#if loading}
    <span class="paisa-icon-button-spinner" aria-hidden="true"></span>
  {:else}
    <span class="paisa-icon-button-icon">
      {@render children?.()}
    </span>
  {/if}
</button>

<style>
  .paisa-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-family: var(--paisa-font-ui, inherit);
    border-radius: var(--paisa-radius-md, 6px);
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      box-shadow 150ms ease;
    line-height: 1;
    padding: 0;
  }

  .paisa-icon-button:focus-visible {
    outline: 2px solid var(--paisa-primary);
    outline-offset: 2px;
  }

  .paisa-icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .paisa-icon-button-rounded {
    border-radius: var(--paisa-radius-full, 9999px);
  }

  .paisa-icon-button-xs {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  .paisa-icon-button-sm {
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }

  .paisa-icon-button-md {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
  }

  .paisa-icon-button-lg {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .paisa-icon-button-primary {
    background-color: var(--paisa-primary);
    color: var(--paisa-inverse-foreground, #fff);
    border-color: var(--paisa-primary);
  }

  .paisa-icon-button-primary:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .paisa-icon-button-secondary {
    background-color: var(--paisa-primary-subtle);
    color: var(--paisa-primary);
  }

  .paisa-icon-button-secondary:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover);
  }

  .paisa-icon-button-ghost {
    background-color: transparent;
    color: var(--paisa-muted-foreground);
  }

  .paisa-icon-button-ghost:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-foreground);
  }

  .paisa-icon-button-danger {
    background-color: var(--paisa-negative);
    color: var(--paisa-inverse-foreground, #fff);
    border-color: var(--paisa-negative);
  }

  .paisa-icon-button-danger:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .paisa-icon-button-outline {
    background-color: transparent;
    border-color: var(--paisa-border-strong);
    color: var(--paisa-foreground);
  }

  .paisa-icon-button-outline:hover:not(:disabled) {
    border-color: var(--paisa-primary);
    color: var(--paisa-primary);
    background-color: var(--paisa-surface-hover);
  }

  .paisa-icon-button-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .paisa-icon-button-spinner {
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: paisa-icon-button-spin 0.6s linear infinite;
  }

  @keyframes paisa-icon-button-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
