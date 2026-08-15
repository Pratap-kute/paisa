<script lang="ts">
  import { sync } from "$lib/api/sync";
  import { isLoggedIn, isMobile, logout } from "$lib/core/utils";
  import { refresh } from "../../../store";
  import { obscure } from "../../../persisted_store";
  import { goto } from "$app/navigation";

  let open = $state(false);
  let dropdownEl: HTMLElement | undefined = $state();

  async function syncWithLoader(request: Record<string, any>) {
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
</script>

<svelte:window onclick={onWindowClick} />

<div
  bind:this={dropdownEl}
  class="dropdown ml-2 {isMobile() ? 'is-left' : 'is-right'}"
  class:is-active={open}
>
  <div class="dropdown-trigger dropdown-icon">
    <button
      type="button"
      class="button is-large"
      aria-label="More actions"
      aria-haspopup="true"
      aria-expanded={open}
      onclick={(e) => {
        e.stopPropagation();
        open = !open;
      }}
    >
      <span class="icon">
        <i class="fas fa-ellipsis-vertical"></i>
      </span>
    </button>
  </div>
  <div class="dropdown-menu" id="dropdown-menu4" role="menu">
    <div class="dropdown-content">
      <button
        type="button"
        onclick={() => syncWithLoader({ journal: true })}
        class="dropdown-item icon-text"
      >
        <span class="icon is-small">
          <i class="fa-regular fa-file-lines"></i>
        </span>
        <span>Sync Journal</span>
      </button>
      <button
        type="button"
        onclick={() => syncWithLoader({ prices: true })}
        class="dropdown-item icon-text"
      >
        <span class="icon is-small">
          <i class="fas fa-dollar-sign"></i>
        </span>
        <span>Update Prices</span>
      </button>
      <button
        type="button"
        onclick={() => syncWithLoader({ portfolios: true })}
        class="dropdown-item icon-text"
      >
        <span class="icon is-small">
          <i class="fas fa-layer-group"></i>
        </span>
        <span>Update Mutual Fund Portfolios</span>
      </button>
      <hr class="dropdown-divider" />
      <div class="dropdown-item icon-text">
        <label for={obscureId} class="paisa-clickable paisa-full-width is-inline-block">
          <input bind:checked={$obscure} id={obscureId} type="checkbox" class="is-hidden" />
          <span class="ml-0 icon is-small">
            <i class="fas {$obscure ? 'fa-eye-slash' : 'fa-eye'}"></i>
          </span>
          <span>{$obscure ? "Show" : "Hide"} numbers</span>
        </label>
      </div>
      {#if showLogout}
        <hr class="dropdown-divider" />
        <button type="button" onclick={() => doLogout()} class="dropdown-item icon-text">
          <span class="icon is-small">
            <i class="fas fa-arrow-right-from-bracket"></i>
          </span>
          <span>Logout</span>
        </button>
      {/if}
    </div>
  </div>
</div>
