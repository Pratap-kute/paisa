<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    active?: boolean;
    title?: string;
    width?: string;
    bodyClass?: string;
    headerClass?: string;
    footerClass?: string;
    onclose?: () => void;
    head?: Snippet<[{ close: (e?: any) => void }]>;
    body?: Snippet;
    foot?: Snippet<[{ close: (e?: any) => void }]>;
    children?: Snippet;
  }

  let {
    active = $bindable(false),
    title = "",
    width = "min(640px, 95vw)",
    bodyClass = "",
    headerClass = "",
    footerClass = "",
    onclose,
    head,
    body,
    foot,
    children,
  }: Props = $props();

  function close(_e?: any) {
    active = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && active) {
      close();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal {active ? 'is-active' : ''}" role="dialog" aria-modal="true">
  <button
    type="button"
    class="modal-background"
    aria-label="close modal"
    onclick={close}
  ></button>
  <div class="modal-card paisa-modal-card" style:width>
    {#if head || title}
      <header class="modal-card-head paisa-modal-head {headerClass}">
        {#if head}
          {@render head({ close })}
        {:else}
          <p class="modal-card-title paisa-modal-title mb-0">{title}</p>
          <button
            type="button"
            class="delete"
            aria-label="close"
            onclick={close}
          ></button>
        {/if}
      </header>
    {/if}
    <section class="modal-card-body paisa-modal-body {bodyClass}">
      {#if body}
        {@render body()}
      {:else if children}
        {@render children()}
      {/if}
    </section>
    {#if foot}
      <footer class="modal-card-foot paisa-modal-foot {footerClass}">
        {@render foot({ close })}
      </footer>
    {/if}
  </div>
</div>

<style lang="scss">
  .paisa-modal-card {
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-lg);
    box-shadow: var(--paisa-shadow-lg);
    overflow: visible;
  }

  .paisa-modal-head {
    background-color: var(--paisa-surface-bg);
    border-bottom: 1px solid var(--paisa-border-subtle);
    padding: var(--paisa-space-4);
  }

  .paisa-modal-title {
    color: var(--paisa-text-primary);
    font-size: var(--paisa-font-size-lg);
    font-weight: var(--paisa-font-weight-bold);
  }

  .paisa-modal-body {
    background-color: var(--paisa-surface-bg);
    color: var(--paisa-text-primary);
    padding: var(--paisa-space-4);
    overflow-y: auto;
  }

  .paisa-modal-foot {
    background-color: var(--paisa-surface-muted);
    border-top: 1px solid var(--paisa-border-subtle);
    padding: var(--paisa-space-3) var(--paisa-space-4);
  }
</style>
