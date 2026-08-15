<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "none" | "xs" | "sm" | "md" | "lg" | "xl";
  type AlignOption = "start" | "center" | "end" | "stretch";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    gap?: GapSize;
    align?: AlignOption;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    gap = 4,
    align = "stretch",
    class: className = "",
    style = "",
    children,
    ...restProps
  }: Props = $props();

  const gapClasses: Record<string, string> = {
    0: "gap-0",
    none: "gap-0",
    1: "gap-1",
    xs: "gap-1",
    2: "gap-2",
    sm: "gap-2",
    3: "gap-3",
    md: "gap-3",
    4: "gap-4",
    lg: "gap-4",
    5: "gap-5",
    xl: "gap-5",
    6: "gap-6",
  };

  const alignClasses: Record<AlignOption, string> = {
    start: "is-align-items-flex-start",
    center: "is-align-items-center",
    end: "is-align-items-flex-end",
    stretch: "is-align-items-stretch",
  };
</script>

<div
  class="paisa-stack {gapClasses[gap] || 'gap-4'} {alignClasses[align]} {className}"
  {style}
  {...restProps}
>
  {@render children?.()}
</div>

<style lang="scss">
  .paisa-stack {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
</style>
