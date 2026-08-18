<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import { createDiffEditor } from "$lib/editors/editor";
  import type { LedgerFile } from "$lib/core/utils";
  let editorDom: Element = $state();
  let selectedFileIndex = $state(0);

  const dispatch = createEventDispatcher();
  interface Props {
    oldFiles?: LedgerFile[];
    newFiles?: LedgerFile[];
    updatedTransactionsCount?: number;
    open?: boolean;
  }

  let {
    oldFiles = [],
    newFiles = [],
    updatedTransactionsCount = 0,
    open = $bindable(false)
  }: Props = $props();

  let changedFiles = $derived.by(() => {
    const oldF: LedgerFile[] = [];
    const newF: LedgerFile[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      if (oldFiles[i] && newFiles[i] && oldFiles[i].content !== newFiles[i].content) {
        oldF.push(oldFiles[i]);
        newF.push(newFiles[i]);
      }
    }
    return { oldF, newF };
  });

  let changedOldFiles = $derived(changedFiles.oldF);
  let changedNewFiles = $derived(changedFiles.newF);

  $effect(() => {
    if (open && changedOldFiles.length > 0 && editorDom) {
      const editor = createDiffEditor(
        changedOldFiles[selectedFileIndex].content,
        changedNewFiles[selectedFileIndex].content,
        editorDom
      );
      return () => {
        editor.destroy();
      };
    }
  });
</script>

<Modal
  bind:active={open}
  width="min(1300px, 100vw)"
  bodyClass="p-0 min-h-[500px]"
  headerClass="pt-1 pb-1"
  footerClass="is-justify-content-right"
>
  {#snippet head({ close })}
  
      <p class="modal-card-title">
        {#if changedOldFiles.length > 0}
          {changedOldFiles[selectedFileIndex]?.name}
          [{selectedFileIndex + 1}/{changedNewFiles.length}]
        {:else}
          No Changes
        {/if}
      </p>
      <div class="field has-addons mt-3 mr-3">
        {#if changedOldFiles.length > 0}
          <div class="mr-3 mt-2"><b>{updatedTransactionsCount}</b> transaction(s) changed</div>
        {/if}
        <p class="control">
          <button
            class="button"
            disabled={selectedFileIndex <= 0}
            onclick={(_e) => selectedFileIndex--}
          >
            <span class="icon is-small">
              <i class="fas fa-chevron-left"></i>
            </span>
            <span>Prev</span>
          </button>
        </p>
        <p class="control">
          <button
            class="button"
            disabled={selectedFileIndex >= changedNewFiles.length - 1}
            onclick={(_e) => selectedFileIndex++}
          >
            <span>Next</span>
            <span class="icon is-small">
              <i class="fas fa-chevron-right"></i>
            </span>
          </button>
        </p>
      </div>
      <button class="delete" aria-label="close" onclick={(e) => close(e)}></button>
    
  {/snippet}
  {#snippet body()}
    <div class="field" >
      <div class="box py-0">
        <div class="diff-editor" bind:this={editorDom}></div>
        {#if changedOldFiles.length === 0}
          <div class="has-text-centered mt-6">
            <strong>Oops!</strong> No changes has been made. Make sure the bulk edit arguments are correct.
          </div>
        {/if}
      </div>
    </div>
  {/snippet}
  {#snippet foot({ close })}
  
      <button class="button" onclick={(e) => close(e)}>Cancel</button>
      {#if changedOldFiles.length > 0}
        <button
          class="button is-success"
          onclick={(e) => dispatch("save", changedNewFiles) && close(e)}>Save All</button
        >
      {/if}
    
  {/snippet}
</Modal>
