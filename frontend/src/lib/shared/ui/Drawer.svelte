<script lang="ts">
import { Dialog as BitsDialog } from "bits-ui";
import type { Snippet } from "svelte";

interface Props {
  open?: boolean;
  title: string;
  description?: string;
  side?: "right" | "left";
  contentClass?: string;
  overlayClass?: string;
  bodyClass?: string;
  showHeader?: boolean;
  unstyled?: boolean;
  trigger?: Snippet;
  header?: Snippet<[{ close: () => void }]>;
  children?: Snippet<[{ close: () => void }]>;
}

let {
  open = $bindable(false),
  title,
  description,
  side = "right",
  contentClass = "",
  overlayClass = "",
  bodyClass = "",
  showHeader = true,
  unstyled = false,
  trigger,
  header,
  children,
}: Props = $props();

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
    <BitsDialog.Content class="{unstyled ? '' : `paisa4-drawer paisa4-drawer-${side}`} {contentClass}">
      {#if !showHeader}
        <BitsDialog.Title class="sr-only">{title}</BitsDialog.Title>
      {:else if header}
        {@render header({ close })}
      {:else}
      <div class="paisa4-dialog-header">
        <div>
          <BitsDialog.Title class="paisa4-dialog-title">{title}</BitsDialog.Title>
          {#if description}
            <BitsDialog.Description class="paisa4-dialog-description">
              {description}
            </BitsDialog.Description>
          {/if}
        </div>
        <BitsDialog.Close class="paisa4-icon-action" aria-label="Close drawer">x</BitsDialog.Close>
      </div>
      {/if}
      <div class="{unstyled ? '' : 'paisa4-dialog-body'} {bodyClass}">
        {@render children?.({ close })}
      </div>
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>
