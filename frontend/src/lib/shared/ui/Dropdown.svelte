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

let dropdownEl: HTMLElement | undefined = $state();

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
  class="paisa-dropdown {align === 'right' ? 'paisa-dropdown-right' : ''} {hoverable ? 'paisa-dropdown-hoverable' : ''} {open ? 'paisa-dropdown-open' : ''} {className}"
>
  <div class="paisa-dropdown-trigger">
    {#if trigger}
      {@render trigger({ toggle, open })}
    {/if}
  </div>
  <div class="paisa-dropdown-menu" role="menu">
    <div class="paisa-dropdown-content">
      {#if children}
        {@render children({ close })}
      {/if}
    </div>
  </div>
</div>

<style>
.paisa-dropdown {
  position: relative;
  display: inline-flex;
  vertical-align: top;
}

.paisa-dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  min-width: 12rem;
  padding-top: var(--paisa-space-1, 0.25rem);
}

.paisa-dropdown-right .paisa-dropdown-menu {
  left: auto;
  right: 0;
}

.paisa-dropdown-open .paisa-dropdown-menu,
.paisa-dropdown-hoverable:hover .paisa-dropdown-menu {
  display: block;
}

.paisa-dropdown-content {
  background-color: var(--paisa-dropdown-bg);
  border: 1px solid var(--paisa-dropdown-border);
  border-radius: var(--paisa-radius-md, 6px);
  box-shadow: var(--paisa-dropdown-shadow);
  padding: 0.35rem 0;
  min-width: max-content;
}
</style>
