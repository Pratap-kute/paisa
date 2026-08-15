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
  <div class="modal-card" style:width>
    {#if head || title}
      <header class="modal-card-head {headerClass}">
        {#if head}
          {@render head({ close })}
        {:else}
          <p class="modal-card-title is-size-5 has-text-weight-bold mb-0">{title}</p>
          <button
            type="button"
            class="delete"
            aria-label="close"
            onclick={close}
          ></button>
        {/if}
      </header>
    {/if}
    <section class="modal-card-body {bodyClass}">
      {#if body}
        {@render body()}
      {:else if children}
        {@render children()}
      {/if}
    </section>
    {#if foot}
      <footer class="modal-card-foot {footerClass}">
        {@render foot({ close })}
      </footer>
    {/if}
  </div>
</div>
