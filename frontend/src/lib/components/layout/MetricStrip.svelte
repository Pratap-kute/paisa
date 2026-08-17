<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    cols?: 2 | 3 | 4 | "auto";
    class?: string;
    style?: string;
    children?: Snippet;
  }

  let {
    cols = "auto",
    class: className = "",
    style = "",
    children,
    ...restProps
  }: Props = $props();

  const colsClasses: Record<string, string> = {
    2: "paisa-metric-strip-cols-2",
    3: "paisa-metric-strip-cols-3",
    4: "paisa-metric-strip-cols-4",
    auto: "paisa-metric-strip-auto",
  };
</script>

<div
  class="paisa-metric-strip {colsClasses[cols] || 'paisa-metric-strip-auto'} {className}"
  {style}
  {...restProps}
>
  {@render children?.()}
</div>

<style lang="scss">
  .paisa-metric-strip {
    display: grid;
    width: 100%;
    gap: var(--paisa-space-3);
    margin-bottom: var(--paisa-space-4);
  }

  .paisa-metric-strip-auto {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .paisa-metric-strip-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .paisa-metric-strip-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .paisa-metric-strip-cols-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @media screen and (min-width: 769px) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
