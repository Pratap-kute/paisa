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
  class="button paisa-button {variantClasses[variant]} {sizeClasses[size]} {loading ? 'is-loading' : ''} {className}"
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

<style lang="scss">
  .paisa-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--paisa-space-2);
    font-family: var(--paisa-font-sans);
    font-weight: var(--paisa-font-weight-medium);
    border-radius: var(--paisa-radius-md);
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color var(--paisa-transition-fast), border-color var(--paisa-transition-fast), color var(--paisa-transition-fast), box-shadow var(--paisa-transition-fast);
    line-height: normal;

    &:focus-visible {
      outline: none;
      box-shadow: var(--paisa-focus-ring);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  /* Sizes */
  .paisa-button-xs {
    height: 28px;
    padding: 0 var(--paisa-space-2);
    font-size: var(--paisa-font-size-xs);
  }

  .paisa-button-sm {
    height: 32px;
    padding: 0 var(--paisa-space-3);
    font-size: var(--paisa-font-size-sm);
  }

  .paisa-button-md {
    height: 36px;
    padding: 0 var(--paisa-space-4);
    font-size: var(--paisa-font-size-sm);
  }

  .paisa-button-lg {
    height: 40px;
    padding: 0 var(--paisa-space-5);
    font-size: var(--paisa-font-size-base);
  }

  /* Variants */
  .paisa-button-primary {
    background-color: var(--paisa-brand-primary);
    color: var(--paisa-text-inverse);
    border-color: var(--paisa-brand-primary);

    &:hover:not(:disabled) {
      background-color: var(--paisa-brand-primary-hover);
      border-color: var(--paisa-brand-primary-hover);
      color: var(--paisa-text-inverse);
    }
  }

  .paisa-button-secondary {
    background-color: var(--paisa-brand-primary-light);
    color: var(--paisa-brand-primary);
    border-color: transparent;

    &:hover:not(:disabled) {
      background-color: var(--paisa-surface-active);
      color: var(--paisa-brand-primary-hover);
    }
  }

  .paisa-button-ghost {
    background-color: transparent;
    color: var(--paisa-text-secondary);
    border-color: transparent;

    &:hover:not(:disabled) {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-text-primary);
    }
  }

  .paisa-button-danger {
    background-color: var(--paisa-danger);
    color: var(--paisa-text-inverse);
    border-color: var(--paisa-danger);

    &:hover:not(:disabled) {
      background-color: #dc2626;
      color: var(--paisa-text-inverse);
    }
  }

  .paisa-button-link {
    background-color: transparent;
    color: var(--paisa-brand-primary);
    border-color: transparent;
    padding-left: 0;
    padding-right: 0;

    &:hover:not(:disabled) {
      text-decoration: underline;
      color: var(--paisa-brand-primary-hover);
    }
  }

  .paisa-button-outline {
    background-color: transparent;
    border-color: var(--paisa-border-strong);
    color: var(--paisa-text-primary);

    &:hover:not(:disabled) {
      border-color: var(--paisa-brand-primary);
      color: var(--paisa-brand-primary);
      background-color: var(--paisa-surface-hover);
    }
  }
</style>
