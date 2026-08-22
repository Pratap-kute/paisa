<script lang="ts">
  import _ from "lodash";

  interface Props {
    options: { label: string; value: any }[];
    value: any;
  }

  let { options, value = $bindable() }: Props = $props();

  $effect(() => {
    if (value && !options.find((option) => option.value === value) && !_.isEmpty(options)) {
      value = _.last(options).value;
    }
  });
</script>

<div class="paisa-boxed-tabs" role="tablist">
  {#each options as option}
    <button
      type="button"
      role="tab"
      aria-selected={option.value === value}
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
    padding: 0.25rem;
    border-radius: var(--paisa-radius-sm, 4px);
    background-color: var(--paisa-surface-hover);
  }

  .paisa-boxed-tab {
    display: inline-flex;
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
</style>
