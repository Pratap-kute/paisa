<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "none" | "xs" | "sm" | "md" | "lg" | "xl";
  type AlignOption = "start" | "center" | "end" | "baseline";
  type JustifyOption = "start" | "center" | "end" | "space-between" | "space-around";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    gap?: GapSize;
    align?: AlignOption;
    justify?: JustifyOption;
    wrap?: boolean;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    gap = 2,
    align = "center",
    justify = "start",
    wrap = true,
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
    baseline: "is-align-items-baseline",
  };

  const justifyClasses: Record<JustifyOption, string> = {
    start: "is-justify-content-flex-start",
    center: "is-justify-content-center",
    end: "is-justify-content-flex-end",
    "space-between": "is-justify-content-space-between",
    "space-around": "is-justify-content-space-around",
  };
</script>

<div
  class="is-flex {wrap ? 'is-flex-wrap-wrap' : 'is-flex-wrap-nowrap'} {gapClasses[gap] || 'gap-2'} {alignClasses[align]} {justifyClasses[justify]} {className}"
  {style}
  {...restProps}
>
  {@render children?.()}
</div>
