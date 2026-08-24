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
    primary: "paisa-button-primary",
    secondary: "paisa-button-secondary",
    ghost: "paisa-button-ghost",
    danger: "paisa-button-danger",
    link: "paisa-button-link",
    outline: "paisa-button-outline",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    xs: "paisa-button-xs",
    sm: "paisa-button-sm",
    md: "paisa-button-md",
    lg: "paisa-button-lg",
  };
</script>

<button
  {type}
  class="paisa-button {variantClasses[variant]} {sizeClasses[size]} {loading ? 'paisa-button-loading' : ''} {className}"
  disabled={disabled || loading}
  aria-label={ariaLabel}
  aria-busy={loading || undefined}
  {title}
  {onclick}
>
  {#if loading}
    <span class="paisa-button-spinner" aria-hidden="true"></span>
  {/if}
  {#if icon && !loading}
    <span class="paisa-button-icon">
      {@render icon()}
    </span>
  {/if}
  {#if children}
    <span>
      {@render children()}
    </span>
  {/if}
</button>

<style>
  .paisa-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--paisa-space-2, 0.5rem);
    margin: 0;
    appearance: none;
    font: inherit;
    font-weight: 500;
    border-radius: var(--paisa-radius-md, 6px);
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      color 150ms ease,
      box-shadow 150ms ease;
    line-height: normal;
  }

  .paisa-button:focus-visible {
    outline: 2px solid var(--paisa-primary);
    outline-offset: 2px;
  }

  .paisa-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .paisa-button-xs {
    height: 28px;
    padding: 0 0.5rem;
    font-size: 0.75rem;
  }

  .paisa-button-sm {
    height: 32px;
    padding: 0 0.75rem;
    font-size: 0.875rem;
  }

  .paisa-button-md {
    height: 36px;
    padding: 0 1rem;
    font-size: 0.875rem;
  }

  .paisa-button-lg {
    height: 40px;
    padding: 0 1.25rem;
    font-size: 1rem;
  }

  .paisa-button-primary {
    background-color: var(--paisa-primary);
    color: var(--paisa-inverse-foreground, #fff);
    border-color: var(--paisa-primary);
  }

  .paisa-button-primary:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .paisa-button-secondary {
    background-color: var(--paisa-primary-subtle);
    color: var(--paisa-primary);
  }

  .paisa-button-secondary:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover);
  }

  .paisa-button-ghost {
    background-color: transparent;
    color: var(--paisa-muted-foreground);
  }

  .paisa-button-ghost:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-foreground);
  }

  .paisa-button-danger {
    background-color: var(--paisa-negative);
    color: var(--paisa-inverse-foreground, #fff);
    border-color: var(--paisa-negative);
  }

  .paisa-button-danger:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .paisa-button-link {
    background-color: transparent;
    color: var(--paisa-primary);
    padding-left: 0;
    padding-right: 0;
  }

  .paisa-button-link:hover:not(:disabled) {
    text-decoration: underline;
  }

  .paisa-button-outline {
    background-color: transparent;
    border-color: var(--paisa-border-strong);
    color: var(--paisa-foreground);
  }

  .paisa-button-outline:hover:not(:disabled) {
    border-color: var(--paisa-primary);
    color: var(--paisa-primary);
    background-color: var(--paisa-surface-hover);
  }

  .paisa-button-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.875rem;
  }

  .paisa-button-spinner {
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: paisa-button-spin 0.6s linear infinite;
  }

  @keyframes paisa-button-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
