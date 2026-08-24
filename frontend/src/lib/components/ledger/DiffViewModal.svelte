<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Dialog from "$lib/shared/ui/Dialog.svelte";
  import { createDiffEditor } from "$lib/shared/editor/editor";
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

<Dialog
  bind:open
  width="min(1300px, 96vw)"
  bodyClass="p-0 min-h-[500px]"
  footerClass="p-0"
>
  {#snippet header({ close })}
    <div class="paisa-diff-header">
      <div class="paisa-diff-title-area">
        <div class="paisa-diff-filename">
          <i class="fa-solid fa-file-code text-[var(--paisa-primary)] mr-2"></i>
          {#if changedOldFiles.length > 0}
            <span>{changedOldFiles[selectedFileIndex]?.name}</span>
            <span class="paisa-diff-counter">[{selectedFileIndex + 1}/{changedNewFiles.length}]</span>
          {:else}
            <span>No Changes</span>
          {/if}
        </div>
        {#if changedOldFiles.length > 0}
          <div class="paisa-diff-count-badge">
            <b>{updatedTransactionsCount}</b> transaction{updatedTransactionsCount === 1 ? '' : 's'} changed
          </div>
        {/if}
      </div>

      <div class="paisa-diff-nav-area">
        <div class="paisa-diff-page-btns">
          <button
            type="button"
            class="paisa-nav-btn"
            disabled={selectedFileIndex <= 0}
            onclick={() => selectedFileIndex--}
            title="Previous changed file"
          >
            <i class="fas fa-chevron-left text-xs mr-1"></i>
            <span>Prev</span>
          </button>
          <button
            type="button"
            class="paisa-nav-btn"
            disabled={selectedFileIndex >= changedNewFiles.length - 1}
            onclick={() => selectedFileIndex++}
            title="Next changed file"
          >
            <span>Next</span>
            <i class="fas fa-chevron-right text-xs ml-1"></i>
          </button>
        </div>
        <button
          type="button"
          class="paisa-diff-close-btn"
          aria-label="close"
          onclick={() => close()}
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  {/snippet}

  {#snippet children()}
    <div class="paisa-diff-body">
      <div class="diff-editor" bind:this={editorDom}></div>
      {#if changedOldFiles.length === 0}
        <div class="paisa-diff-empty">
          <i class="fa-solid fa-circle-check text-2xl text-[var(--paisa-positive)] mb-2"></i>
          <p class="font-medium text-sm">No changes detected</p>
          <p class="text-xs text-[var(--paisa-muted-foreground)] mt-1">Make sure the bulk edit arguments are correct.</p>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet footer({ close })}
    <div class="paisa-diff-footer">
      <button type="button" class="paisa-cancel-btn" onclick={() => close()}>
        Cancel
      </button>
      {#if changedOldFiles.length > 0}
        <button
          type="button"
          class="paisa-save-btn"
          onclick={() => {
            dispatch("save", changedNewFiles);
            close();
          }}
        >
          <i class="fa-solid fa-check mr-1.5 text-xs"></i>
          <span>Save All</span>
        </button>
      {/if}
    </div>
  {/snippet}
</Dialog>

<style>
  .paisa-diff-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    background-color: var(--paisa-surface);
    border-bottom: 1px solid var(--paisa-border);
    width: 100%;
    box-sizing: border-box;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .paisa-diff-title-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .paisa-diff-filename {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--paisa-foreground);
    display: flex;
    align-items: center;
    font-family: var(--paisa-font-mono);
  }

  .paisa-diff-counter {
    margin-left: 0.375rem;
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
    font-weight: normal;
  }

  .paisa-diff-count-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--paisa-radius-full, 9999px);
    background-color: var(--paisa-primary-subtle);
    color: var(--paisa-primary);
  }

  .paisa-diff-nav-area {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .paisa-diff-page-btns {
    display: inline-flex;
    border-radius: var(--paisa-radius-md, 0.375rem);
    border: 1px solid var(--paisa-border);
    overflow: hidden;
  }

  .paisa-nav-btn {
    height: 1.875rem;
    padding: 0 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: var(--paisa-surface);
    color: var(--paisa-foreground);
    border: none;
    border-right: 1px solid var(--paisa-border);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    transition: background-color var(--paisa-transition-fast);
  }

  .paisa-nav-btn:last-child {
    border-right: none;
  }

  .paisa-nav-btn:hover:not(:disabled) {
    background-color: var(--paisa-surface-hover);
  }

  .paisa-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .paisa-diff-close-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--paisa-radius-md, 0.375rem);
    color: var(--paisa-muted-foreground);
    cursor: pointer;
    font-size: 1rem;
    transition: background-color var(--paisa-transition-fast), color var(--paisa-transition-fast);
  }

  .paisa-diff-close-btn:hover {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-foreground);
  }

  .paisa-diff-body {
    position: relative;
    min-height: 500px;
    background-color: var(--paisa-canvas);
  }

  .paisa-diff-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    text-align: center;
    color: var(--paisa-foreground);
  }

  .paisa-diff-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background-color: var(--paisa-surface-raised);
    border-top: 1px solid var(--paisa-border);
    width: 100%;
    box-sizing: border-box;
  }

  .paisa-cancel-btn {
    height: 2.25rem;
    padding: 0 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--paisa-foreground);
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    cursor: pointer;
    transition: background-color var(--paisa-transition-fast);
  }

  .paisa-cancel-btn:hover {
    background-color: var(--paisa-surface-hover);
  }

  .paisa-save-btn {
    height: 2.25rem;
    padding: 0 1.25rem;
    display: inline-flex;
    align-items: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--paisa-inverse-foreground, #fff);
    background-color: var(--paisa-positive);
    border: none;
    border-radius: var(--paisa-radius-md, 0.375rem);
    cursor: pointer;
    transition: filter var(--paisa-transition-fast);
  }

  .paisa-save-btn:hover {
    filter: brightness(1.08);
  }
</style>
