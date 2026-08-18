<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    id?: string;
    name?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    description?: string;
    class?: string;
    children?: Snippet;
    onchange?: (checked: boolean) => void;
  }

  let {
    id = `checkbox-${Math.random().toString(36).substring(2, 9)}`,
    name,
    checked = $bindable(false),
    disabled = false,
    label = "",
    description = "",
    class: className = "",
    children,
    onchange,
  }: Props = $props();

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
    onchange?.(checked);
  }
</script>

<label class="checkbox is-inline-flex is-align-items-start gap-2 {disabled ? 'is-disabled' : ''} {className}" for={id}>
  <input
    {id}
    {name}
    type="checkbox"
    bind:checked
    {disabled}
    onchange={handleChange}
    class="mt-1"
  />
  <div>
    {#if children}
      {@render children()}
    {:else if label}
      <span class="has-text-weight-normal">{label}</span>
    {/if}
    {#if description}
      <p class="help is-marginless has-text-grey">{description}</p>
    {/if}
  </div>
</label>
