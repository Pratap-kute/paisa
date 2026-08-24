<script lang="ts">
  interface TabOption<T = unknown> {
    label: string;
    value: T;
    icon?: string;
    badge?: string | number;
    disabled?: boolean;
  }

  interface Props<T = unknown> {
    options: TabOption<T>[];
    value: T;
    variant?: "boxed" | "line" | "pills";
    size?: "sm" | "md";
    class?: string;
    onchange?: (value: T) => void;
  }

  let {
    options,
    value = $bindable(),
    variant = "boxed",
    size = "sm",
    class: className = "",
    onchange,
  }: Props = $props();

  function selectTab(val: unknown) {
    value = val as typeof value;
    onchange?.(val as typeof value);
  }
</script>

{#if variant === "boxed"}
  <div
    class="flex flex-wrap gap-1 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] p-1 {size === 'md' ? 'text-sm' : 'text-xs'} {className}"
    role="tablist"
  >
    {#each options as option}
      <button
        type="button"
        role="tab"
        aria-selected={option.value === value}
        disabled={option.disabled}
        class="inline-flex items-center gap-1.5 rounded-[var(--paisa-radius-sm)] px-3 py-1.5 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] disabled:cursor-not-allowed disabled:opacity-50 {option.value === value ? 'bg-[var(--paisa-surface)] text-[var(--paisa-foreground)] shadow-xs' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-foreground)]'}"
        onclick={() => selectTab(option.value)}
      >
        {#if option.icon}
          <i class="fas {option.icon} text-[0.75rem]" aria-hidden="true"></i>
        {/if}
        <span>{option.label}</span>
        {#if option.badge}
          <span class="ml-1 rounded-full bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 text-[0.625rem] font-semibold"
            >{option.badge}</span
          >
        {/if}
      </button>
    {/each}
  </div>
{:else}
  <div class="border-b border-[var(--paisa-border-subtle)] {className}" role="tablist">
    <ul class="m-0 flex list-none gap-0 p-0">
      {#each options as option}
        <li class="m-0">
          <button
            type="button"
            role="tab"
            aria-selected={option.value === value}
            disabled={option.disabled}
            class="inline-flex items-center gap-1.5 border-0 bg-transparent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] disabled:cursor-not-allowed disabled:opacity-50 {option.value === value ? 'border-b-2 border-[var(--paisa-primary)] text-[var(--paisa-primary)]' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-foreground)]'}"
            onclick={() => selectTab(option.value)}
          >
            {#if option.icon}
              <i class="fas {option.icon} text-[0.75rem]" aria-hidden="true"></i>
            {/if}
            <span>{option.label}</span>
            {#if option.badge}
              <span class="ml-1 rounded-full bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 text-[0.625rem] font-semibold"
                >{option.badge}</span
              >
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
