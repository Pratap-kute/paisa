<script lang="ts">
import { Dialog as BitsDialog } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  open?: boolean;
  title?: string;
  description?: string;
  width?: string;
  contentClass?: string;
  overlayClass?: string;
  bodyClass?: string;
  footerClass?: string;
  showHeader?: boolean;
  unstyled?: boolean;
  onclose?: () => void;
  trigger?: Snippet;
  header?: Snippet<[{ close: () => void }]>;
  footer?: Snippet<[{ close: () => void }]>;
  children?: Snippet<[{ close: () => void }]>;
}

let {
  open = $bindable(false),
  title,
  description,
  width = "min(560px, calc(100vw - 32px))",
  contentClass = "",
  overlayClass = "",
  bodyClass = "",
  footerClass = "",
  showHeader = true,
  unstyled = false,
  onclose,
  trigger,
  header,
  footer,
  children,
}: Props = $props();

let wasOpen = $state(false);

$effect(() => {
  if (wasOpen && !open) {
    onclose?.();
  }
  wasOpen = open;
});

function close() {
  open = false;
}
</script>

<BitsDialog.Root bind:open>
  {#if trigger}
    <BitsDialog.Trigger class="paisa4-trigger-reset">
      {@render trigger()}
    </BitsDialog.Trigger>
  {/if}
  <BitsDialog.Portal>
    <BitsDialog.Overlay class="{unstyled ? '' : 'paisa4-overlay'} {overlayClass}" />
    <BitsDialog.Content class="{unstyled ? '' : 'paisa4-dialog'} {contentClass}" style={unstyled ? undefined : `width: ${width}`}>
      {#if title && !showHeader}
        <BitsDialog.Title class="sr-only">{title}</BitsDialog.Title>
      {/if}
      {#if header && showHeader}
        {@render header({ close })}
      {:else if title && showHeader}
        <div class="paisa4-dialog-header">
          <div>
            <BitsDialog.Title class="paisa4-dialog-title">{title}</BitsDialog.Title>
            {#if description}
              <BitsDialog.Description class="paisa4-dialog-description">
                {description}
              </BitsDialog.Description>
            {/if}
          </div>
          <BitsDialog.Close class="paisa4-icon-action" aria-label="Close dialog">x</BitsDialog.Close>
        </div>
      {/if}
      <div class="{unstyled ? '' : 'paisa4-dialog-body'} {bodyClass}">
        {@render children?.({ close })}
      </div>
      {#if footer}
        <div class="paisa4-dialog-footer {footerClass}">
          {@render footer({ close })}
        </div>
      {/if}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>
