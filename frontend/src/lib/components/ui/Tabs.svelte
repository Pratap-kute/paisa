<script lang="ts">
  import _ from "lodash";

  interface TabOption<T = any> {
    label: string;
    value: T;
    icon?: string;
    badge?: string | number;
    disabled?: boolean;
  }

  interface Props<T = any> {
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

  function selectTab(val: any) {
    value = val;
    onchange?.(val);
  }
</script>

{#if variant === "boxed"}
  <div class="boxed-tabs {size === 'md' ? 'is-medium' : ''} {className}" role="tablist">
    {#each options as option}
      <button
        type="button"
        role="tab"
        aria-selected={option.value === value}
        disabled={option.disabled}
        class="boxed-tab {option.value === value ? 'is-active' : ''}"
        onclick={() => selectTab(option.value)}
      >
        {#if option.icon}
          <span class="icon is-small mr-1">
            <i class="fas {option.icon}"></i>
          </span>
        {/if}
        <span>{option.label}</span>
        {#if option.badge}
          <span class="tag is-rounded is-small ml-1.5">{option.badge}</span>
        {/if}
      </button>
    {/each}
  </div>
{:else}
  <div class="tabs {size === 'sm' ? 'is-small' : ''} {className}" role="tablist">
    <ul>
      {#each options as option}
        <li class={option.value === value ? 'is-active' : ''}>
          <button
            type="button"
            role="tab"
            aria-selected={option.value === value}
            disabled={option.disabled}
            class="paisa-button-reset is-flex is-align-items-center"
            onclick={() => selectTab(option.value)}
          >
            {#if option.icon}
              <span class="icon is-small mr-1">
                <i class="fas {option.icon}"></i>
              </span>
            {/if}
            <span>{option.label}</span>
            {#if option.badge}
              <span class="tag is-rounded is-small ml-1.5">{option.badge}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
