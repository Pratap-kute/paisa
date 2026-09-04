<script lang="ts">
import { Tabs as BitsTabs } from "bits-ui";
import type { Snippet } from "svelte";

export interface TabOption {
  label: string;
  value: string;
  icon?: string;
  badge?: string | number;
  disabled?: boolean;
}

interface Props {
  options: TabOption[];
  value: string;
  variant?: "boxed" | "line" | "pills";
  size?: "sm" | "md";
  class?: string;
  ariaLabel?: string;
  onchange?: (value: string) => void;
  panel?: Snippet<[TabOption]>;
}

let {
  options,
  value = $bindable(),
  variant = "boxed",
  size = "sm",
  class: className = "",
  ariaLabel = "Sections",
  onchange,
  panel,
}: Props = $props();
</script>

<BitsTabs.Root bind:value onValueChange={onchange}>
  <BitsTabs.List
    aria-label={ariaLabel}
    class={variant === "boxed"
      ? `flex flex-wrap gap-1 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface-raised p-1 ${size === "md" ? "text-sm" : "text-xs"} ${className}`
      : `m-0 flex list-none gap-0 border-b border-border-subtle p-0 ${className}`}
  >
    {#each options as option}
      <BitsTabs.Trigger
        value={option.value}
        disabled={option.disabled}
        class={variant === "boxed"
          ? "inline-flex items-center gap-1.5 rounded-[var(--paisa-radius-sm)] px-3 py-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
          : "inline-flex items-center gap-1.5 border-0 bg-transparent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:border-b-2 data-[state=active]:border-[var(--paisa-primary)] data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"}
      >
        {#if option.icon}
          <i class="fas {option.icon} text-[0.75rem]" aria-hidden="true"></i>
        {/if}
        <span>{option.label}</span>
        {#if option.badge}
          <span class="ml-1 rounded-full bg-surface-hover px-1.5 py-0.5 text-[0.625rem] font-semibold">{option.badge}</span>
        {/if}
      </BitsTabs.Trigger>
    {/each}
  </BitsTabs.List>
  {#if panel}
    {#each options as option}
      <BitsTabs.Content value={option.value} class="mt-4 outline-none">
        {@render panel(option)}
      </BitsTabs.Content>
    {/each}
  {/if}
</BitsTabs.Root>
