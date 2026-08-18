<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    open?: boolean;
    align?: "left" | "right";
    hoverable?: boolean;
    class?: string;
    trigger?: Snippet<[{ toggle: () => void; open: boolean }]>;
    children?: Snippet<[{ close: () => void }]>;
  }

  let {
    open = $bindable(false),
    align = "left",
    hoverable = false,
    class: className = "",
    trigger,
    children,
  }: Props = $props();

  let dropdownEl: HTMLElement = $state();

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function handleClickOutside(e: MouseEvent) {
    if (open && dropdownEl && !dropdownEl.contains(e.target as Node)) {
      close();
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div
  bind:this={dropdownEl}
  class="dropdown {align === 'right' ? 'is-right' : ''} {hoverable ? 'is-hoverable' : ''} {open ? 'is-active' : ''} {className}"
>
  <div class="dropdown-trigger">
    {#if trigger}
      {@render trigger({ toggle, open })}
    {/if}
  </div>
  <div class="dropdown-menu" role="menu">
    <div class="dropdown-content">
      {#if children}
        {@render children({ close })}
      {/if}
    </div>
  </div>
</div>
