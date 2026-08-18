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
    none: "p-0 paisa-card-pad-none",
    xs: "p-2 paisa-card-pad-xs",
    sm: "p-3 paisa-card-pad-sm",
    md: "p-4 paisa-card-pad-md",
    lg: "p-5 paisa-card-pad-lg",
  };

  const variantClasses: Record<CardVariant, string> = {
    default: "paisa-card-default",
    flat: "box-shadow-none paisa-card-flat",
    bordered: "is-bordered paisa-card-bordered",
  };
</script>

<div
  class="box paisa-card {variantClasses[variant]} {paddingClasses[
    padding
  ]} {interactive ? 'paisa-card-interactive' : ''} {className}"
  {style}
  {...restProps}
>
  {#if header}
    <div class="paisa-card-header mb-3">
      {@render header()}
    </div>
  {/if}
  {@render children?.()}
  {#if footer}
    <div class="paisa-card-footer mt-3 pt-2">
      {@render footer()}
    </div>
  {/if}
</div>

<style lang="scss">
  .box.paisa-card {
    width: 100%;
    margin-bottom: 0;
    border-radius: var(--paisa-radius-md);
    background-color: var(--paisa-surface-card);
    color: var(--paisa-text-primary);
    transition:
      transform var(--paisa-transition-fast),
      box-shadow var(--paisa-transition-fast),
      border-color var(--paisa-transition-fast);
  }

  .paisa-card-default {
    border: 1px solid var(--paisa-border-default);
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
    padding: var(--paisa-space-2);
  }
  .paisa-card-pad-sm {
    padding: var(--paisa-space-3);
  }
  .paisa-card-pad-md {
    padding: var(--paisa-space-4);
  }
  .paisa-card-pad-lg {
    padding: var(--paisa-space-5);
  }

  .paisa-card-interactive {
    cursor: pointer;

    &:hover {
      border-color: var(--paisa-brand-primary);
      box-shadow: var(--paisa-shadow-md);
    }
  }

  .paisa-card-header {
    border-bottom: 1px solid var(--paisa-border-subtle);
    padding-bottom: var(--paisa-space-2);
  }

  .paisa-card-footer {
    border-top: 1px solid var(--paisa-border-subtle);
  }
</style>
