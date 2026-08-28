<script lang="ts">
interface Props {
  options: { label: string; value: any }[];
  value: any;
  mobileGrid?: boolean;
}

let { options, value = $bindable(), mobileGrid = false }: Props = $props();

$effect(() => {
  if (
    value && !options.find((option) => option.value === value) &&
    options.length > 0
  ) {
    value = options.at(-1)?.value;
  }
});
</script>

<div
  class="paisa-boxed-tabs {mobileGrid ? 'paisa-boxed-tabs-mobile-grid' : ''}"
  role="group"
>
  {#each options as option}
    <button
      type="button"
      aria-pressed={option.value === value}
      class="paisa-boxed-tab {option.value === value ? 'paisa-boxed-tab-active' : ''}"
      onclick={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
.paisa-boxed-tabs {
  display: inline-flex;
  min-width: max-content;
  padding: 0.25rem;
  border-radius: var(--paisa-radius-sm, 4px);
  background-color: var(--paisa-surface-hover);
}

.paisa-boxed-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  height: 1.5rem;
  padding: 0 0.75rem;
  border-radius: var(--paisa-radius-sm, 4px);
  color: var(--paisa-muted-foreground);
  font-size: var(--paisa-font-size-xs, 0.75rem);
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  line-height: normal;
  white-space: nowrap;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    box-shadow 150ms ease;
}

.paisa-boxed-tab:focus-visible {
  outline: 2px solid var(--paisa-primary);
  outline-offset: 2px;
}

.paisa-boxed-tab-active {
  background-color: var(--paisa-surface);
  color: var(--paisa-foreground);
  box-shadow: var(--paisa-shadow-sm);
}

@media (max-width: 639px) {
  .paisa-boxed-tabs-mobile-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
    gap: 0.125rem;
  }

  .paisa-boxed-tabs-mobile-grid .paisa-boxed-tab {
    min-width: 0;
    padding: 0 0.375rem;
  }
}
</style>
