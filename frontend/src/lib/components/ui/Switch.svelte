<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    id?: string;
    checked?: boolean;
    disabled?: boolean;
    size?: "sm" | "md";
    label?: string;
    color?: string;
    children?: Snippet;
    onchange?: (checked: boolean) => void;
  }

  let {
    id = `switch-${Math.random().toString(36).substring(2, 9)}`,
    checked = $bindable(false),
    disabled = false,
    size = "sm",
    label = "",
    color = "",
    children,
    onchange,
  }: Props = $props();

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
    onchange?.(checked);
  }
</script>

<div class="field mb-0 color-switch" style="--color: {color}">
  <input
    {id}
    type="checkbox"
    class="switch is-rounded {size === 'sm' ? 'is-small' : ''}"
    {checked}
    {disabled}
    onchange={handleChange}
  />
  <label for={id}>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </label>
</div>

<style lang="scss">
  .color-switch {
    display: inline-flex;
    align-items: center;

    .switch[type="checkbox"]:checked + label::before,
    .switch[type="checkbox"]:checked + label:before {
      background: var(--color, var(--paisa-brand-primary, #3b82f6));
    }
  }
</style>
