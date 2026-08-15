<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type GridCols = 1 | 2 | 3 | 4 | "auto-fit" | "auto-fill";
  type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "none" | "xs" | "sm" | "md" | "lg" | "xl";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    cols?: GridCols;
    minColWidth?: string;
    gap?: GapSize;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    cols = "auto-fit",
    minColWidth = "280px",
    gap = 4,
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

  const colClasses: Record<string, string> = {
    1: "paisa-grid-cols-1",
    2: "paisa-grid-cols-2",
    3: "paisa-grid-cols-3",
    4: "paisa-grid-cols-4",
    "auto-fit": "paisa-grid-cols-auto-fit",
    "auto-fill": "paisa-grid-cols-auto-fill",
  };
</script>

<div
  class="paisa-responsive-grid {colClasses[cols] || 'paisa-grid-cols-auto-fit'} {gapClasses[gap] || 'gap-4'} {className}"
  style="--paisa-min-col-width: {minColWidth}; {style}"
  {...restProps}
>
  {@render children?.()}
</div>

<style lang="scss">
  .paisa-responsive-grid {
    display: grid;
    width: 100%;
  }

  .paisa-grid-cols-1 {
    grid-template-columns: 1fr;
  }

  .paisa-grid-cols-2 {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .paisa-grid-cols-3 {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .paisa-grid-cols-4 {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 1024px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .paisa-grid-cols-auto-fit {
    grid-template-columns: repeat(auto-fit, minmax(var(--paisa-min-col-width, 280px), 1fr));
  }

  .paisa-grid-cols-auto-fill {
    grid-template-columns: repeat(auto-fill, minmax(var(--paisa-min-col-width, 280px), 1fr));
  }
</style>
