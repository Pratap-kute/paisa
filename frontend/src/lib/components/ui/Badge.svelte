<script lang="ts">
  import type { Snippet } from "svelte";

  type BadgeVariant = "primary" | "success" | "warning" | "danger" | "info" | "neutral";
  type BadgeSize = "sm" | "md" | "lg";

  interface Props {
    variant?: BadgeVariant;
    size?: BadgeSize;
    rounded?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = "neutral",
    size = "sm",
    rounded = false,
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
  {@render children?.()}
</span>
