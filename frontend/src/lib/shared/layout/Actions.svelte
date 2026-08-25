<script lang="ts">
  import { isMobile } from "$lib/shared/browser/responsive";
import { logout } from "$lib/shared/browser/auth";
import { sync } from "$lib/api/sync";
  import { isLoggedIn } from "$lib/shared/browser/auth";
  import { refresh } from "$lib/shared/state/store";
  import { obscure } from "$lib/shared/state/persisted";
  import { goto } from "$app/navigation";

  let open = $state(false);
  let dropdownEl: HTMLElement | undefined = $state();

  async function syncWithLoader(request: Record<string, boolean>) {
    open = false;
    try {
      await sync(request);
    } finally {
      refresh();
    }
  }

  const obscureId = "obscure";
  let initialized = false;
  $effect(() => {
    const isObscured = $obscure;
    if (!initialized) {
      initialized = true;
      return;
    }
    refresh();
  });

  function doLogout() {
    open = false;
    logout();
    goto("/login");
  }

  let showLogout = $derived(isLoggedIn());

  function onWindowClick(event: MouseEvent) {
    if (open && dropdownEl && !dropdownEl.contains(event.target as Node)) {
      open = false;
    }
  }

  const menuItemClass =
    "flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--paisa-foreground)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-primary)]";
</script>

<svelte:window onclick={onWindowClick} />

<div bind:this={dropdownEl} class="relative">
  <button
    type="button"
    class="inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md border-0 bg-transparent text-[var(--paisa-muted-foreground)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)]"
    aria-label="More actions"
    aria-haspopup="true"
    aria-expanded={open}
    onclick={(e) => {
      e.stopPropagation();
      open = !open;
    }}
  >
    <i class="fas fa-ellipsis-vertical text-base" aria-hidden="true"></i>
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute top-full z-50 mt-1 min-w-max rounded-md border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] py-1 shadow-[var(--paisa-shadow-lg)] {isMobile()
        ? 'left-0'
        : 'right-0'}"
    >
      <button
        type="button"
        role="menuitem"
        onclick={() => syncWithLoader({ journal: true })}
        class={menuItemClass}
      >
        <i class="fa-regular fa-file-lines w-5 text-center text-xs" aria-hidden="true"></i>
        <span>Sync Journal</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onclick={() => syncWithLoader({ prices: true })}
        class={menuItemClass}
      >
        <i class="fas fa-dollar-sign w-5 text-center text-xs" aria-hidden="true"></i>
        <span>Update Prices</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onclick={() => syncWithLoader({ portfolios: true })}
        class={menuItemClass}
      >
        <i class="fas fa-layer-group w-5 text-center text-xs" aria-hidden="true"></i>
        <span>Update MF Portfolios</span>
      </button>
      <hr class="my-1 border-0 border-t border-[var(--paisa-border-subtle)]" />
      <div role="none" class="px-4 py-2">
        <label
          for={obscureId}
          class="flex w-full cursor-pointer items-center gap-2 text-sm text-[var(--paisa-foreground)] transition-colors hover:text-[var(--paisa-primary)]"
        >
          <input bind:checked={$obscure} id={obscureId} type="checkbox" class="sr-only" />
          <i
            class="fas {$obscure ? 'fa-eye-slash' : 'fa-eye'} w-5 text-center text-xs"
            aria-hidden="true"
          ></i>
          <span>{$obscure ? "Show" : "Hide"} numbers</span>
        </label>
      </div>
      {#if showLogout}
        <hr class="my-1 border-0 border-t border-[var(--paisa-border-subtle)]" />
        <button type="button" role="menuitem" onclick={() => doLogout()} class={menuItemClass}>
          <i class="fas fa-arrow-right-from-bracket w-5 text-center text-xs" aria-hidden="true"></i>
          <span>Logout</span>
        </button>
      {/if}
    </div>
  {/if}
</div>
