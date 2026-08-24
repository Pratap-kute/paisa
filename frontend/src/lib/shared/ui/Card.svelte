<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type CardVariant = "default" | "flat" | "bordered";
  type CardPadding = "none" | "xs" | "sm" | "md" | "lg";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: CardPadding;
    interactive?: boolean;
    class?: string;
    style?: string;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    variant = "default",
    padding = "md",
    interactive = false,
    class: className = "",
    style = "",
    header,
    footer,
    children,
    ...restProps
  }: Props = $props();

  const paddingClasses: Record<CardPadding, string> = {
    none: "paisa-card-pad-none",
    xs: "paisa-card-pad-xs",
    sm: "paisa-card-pad-sm",
    md: "paisa-card-pad-md",
    lg: "paisa-card-pad-lg",
  };

  const variantClasses: Record<CardVariant, string> = {
    default: "paisa-card-default",
    flat: "paisa-card-flat",
    bordered: "paisa-card-bordered",
  };
</script>

<div
  class="paisa-card {variantClasses[variant]} {paddingClasses[padding]} {interactive ? 'paisa-card-interactive' : ''} {className}"
  {style}
  {...restProps}
>
  {#if header}
    <div class="paisa-card-header">
      {@render header()}
    </div>
  {/if}
  {@render children?.()}
  {#if footer}
    <div class="paisa-card-footer">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .paisa-card {
    width: 100%;
    margin-bottom: 0;
    border-radius: var(--paisa-radius-md, 6px);
    background-color: var(--paisa-surface);
    color: var(--paisa-foreground);
    transition:
      transform 150ms ease,
      box-shadow 150ms ease,
      border-color 150ms ease;
  }

  .paisa-card-default {
    border: 1px solid var(--paisa-border-subtle);
    box-shadow: var(--paisa-shadow-sm);
  }

  .paisa-card-flat {
    border: 1px solid var(--paisa-border-subtle);
    box-shadow: none;
  }

  .paisa-card-bordered {
    border: 1px solid var(--paisa-border-strong);
    box-shadow: none;
  }

  .paisa-card-pad-none {
    padding: 0;
  }

  .paisa-card-pad-xs {
    padding: 0.5rem;
  }

  .paisa-card-pad-sm {
    padding: 0.75rem;
  }

  .paisa-card-pad-md {
    padding: 1rem;
  }

  .paisa-card-pad-lg {
    padding: 1.25rem;
  }

  .paisa-card-interactive {
    cursor: pointer;
  }

  .paisa-card-interactive:hover {
    border-color: var(--paisa-primary);
    box-shadow: var(--paisa-shadow-md);
  }

  .paisa-card-header {
    border-bottom: 1px solid var(--paisa-border-subtle);
    padding-bottom: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .paisa-card-footer {
    border-top: 1px solid var(--paisa-border-subtle);
    padding-top: 0.5rem;
    margin-top: 0.75rem;
  }
</style>
