<script lang="ts">
  import type { Snippet } from "svelte";

  type CardVariant = "default" | "flat" | "bordered";
  type CardPadding = "none" | "xs" | "sm" | "md" | "lg";

  interface Props {
    variant?: CardVariant;
    padding?: CardPadding;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    variant = "default",
    padding = "md",
    class: className = "",
    style = "",
    children,
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
  class="box {paddingClasses[padding]} {variant === 'flat' ? 'box-shadow-none' : ''} {variant === 'bordered' ? 'is-bordered' : ''} {className}"
  {style}
>
  {@render children?.()}
</div>
