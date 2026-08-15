<script lang="ts">
  import type { Snippet } from "svelte";

  type SelectSize = "sm" | "md" | "lg";

  interface OptionItem {
    value: string | number;
    label: string;
    disabled?: boolean;
  }

  interface Props {
    id?: string;
    name?: string;
    value?: string | number;
    options?: OptionItem[];
    size?: SelectSize;
    disabled?: boolean;
    required?: boolean;
    fullwidth?: boolean;
    class?: string;
    icon?: Snippet;
    children?: Snippet;
    onchange?: (e: Event & { currentTarget: HTMLSelectElement }) => void;
  }

  let {
    id,
    name,
    value = $bindable(""),
    options = [],
    size = "sm",
    disabled = false,
    required = false,
    fullwidth = false,
    class: className = "",
    icon,
    children,
    onchange,
  }: Props = $props();

  const sizeClasses: Record<SelectSize, string> = {
    sm: "is-small",
    md: "is-normal",
    lg: "is-medium",
  };
</script>

<div class="control {icon ? 'has-icons-left' : ''}">
  <div class="select {sizeClasses[size]} {fullwidth ? 'is-fullwidth' : ''} {className}">
    <select
      {id}
      {name}
      bind:value
      {disabled}
      {required}
      {onchange}
    >
      {#if children}
        {@render children()}
      {:else if options}
        {#each options as opt}
          <option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
        {/each}
      {/if}
    </select>
  </div>
  {#if icon}
    <span class="icon is-small is-left">
      {@render icon()}
    </span>
  {/if}
</div>
