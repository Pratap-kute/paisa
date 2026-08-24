<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type GridVariant = "cards" | "transactions" | "two-column" | "analysis";
  type GridCols = 1 | 2 | 3 | 4 | "auto-fit" | "auto-fill";
  type GapSize = 0 | 1 | 2 | 3 | 4 | 5 | 6 | "none" | "xs" | "sm" | "md" | "lg" | "xl";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    variant?: GridVariant;
    cols?: GridCols;
    minColWidth?: string;
    gap?: GapSize;
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    variant,
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

  const variantClasses: Record<GridVariant, string> = {
    cards: "paisa-grid-variant-cards",
    transactions: "paisa-grid-variant-transactions",
    "two-column": "paisa-grid-variant-two-column",
    analysis: "paisa-grid-variant-analysis",
  };
</script>

<div
  class="paisa-responsive-grid {variant ? variantClasses[variant] : (colClasses[cols] || 'paisa-grid-cols-auto-fit')} {gapClasses[gap] || 'gap-4'} {className}"
  style="{!variant ? `--paisa-min-col-width: ${minColWidth};` : ''} {style}"
  {...restProps}
>
  {@render children?.()}
</div>

<style>
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

  /* Semantic Presets */
  .paisa-grid-variant-cards {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media screen and (min-width: 1440px) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .paisa-grid-variant-transactions {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media screen and (min-width: 1200px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .paisa-grid-variant-two-column {
    grid-template-columns: 1fr;
    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .paisa-grid-variant-analysis {
    grid-template-columns: 1fr;
    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
    }
  }
</style>
