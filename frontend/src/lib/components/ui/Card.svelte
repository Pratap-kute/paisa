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
    none: "p-0",
    xs: "p-2",
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  };
</script>

<div
  class="box {paddingClasses[padding]} {variant === 'flat' ? 'box-shadow-none' : ''} {variant === 'bordered' ? 'is-bordered' : ''} {interactive ? 'paisa-card-interactive' : ''} {className}"
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

<style>
  .paisa-card-interactive {
    cursor: pointer;
    transition: transform var(--paisa-transition-fast), box-shadow var(--paisa-transition-fast), border-color var(--paisa-transition-fast);
  }
  .paisa-card-interactive:hover {
    border-color: var(--paisa-brand-primary);
    box-shadow: var(--paisa-shadow-md);
  }
  .paisa-card-footer {
    border-top: 1px solid var(--paisa-border-subtle);
  }
</style>
