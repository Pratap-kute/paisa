<script lang="ts">
  interface Props {
    active?: boolean;
    width?: string;
    bodyClass?: string;
    headerClass?: string;
    footerClass?: string;
    head?: import('svelte').Snippet<[any]>;
    body?: import('svelte').Snippet;
    foot?: import('svelte').Snippet<[any]>;
  }

  let {
    active = $bindable(false),
    width = "min(640px, 100vw)",
    bodyClass = "",
    headerClass = "",
    footerClass = "",
    head,
    body,
    foot
  }: Props = $props();
  let close = function (_e: any) {
    active = !active;
  };
</script>

<div class="modal" class:is-active={active}>
  <button type="button" class="modal-background" aria-label="close modal" onclick={(e) => close(e)}></button>
  <div class="modal-card" style:width>
    <header class="modal-card-head {headerClass}">
      {@render head?.({ close, })}
    </header>
    <section class="modal-card-body {bodyClass}">
      {@render body?.()}
    </section>
    <footer class="modal-card-foot {footerClass}">
      {@render foot?.({ close, })}
    </footer>
  </div>
</div>
