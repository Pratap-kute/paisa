<script lang="ts">
  import FileTree from './FileTree.svelte';

  import type { Directory, LedgerFile } from "$lib/core/utils";
  import _ from "lodash";
  import { createEventDispatcher } from "svelte";

  interface Props {
    files: Array<Directory | LedgerFile>;
    path: string;
    selectedFileName: string;
    hasUnsavedChanges: boolean;
    root?: boolean;
    onselect?: (file: LedgerFile | Directory) => void;
  }

  let {
    files,
    path,
    selectedFileName,
    hasUnsavedChanges,
    root = true,
    onselect
  }: Props = $props();

  const dispatch = createEventDispatcher();

  function handleSelect(file: LedgerFile | Directory) {
    if (onselect) {
      onselect(file);
    }
    dispatch("select", file);
  }

  function fileName(path: string) {
    return _.last(path.split("/"));
  }

  function join(paths: string[]) {
    return _.filter(paths, (p) => !_.isEmpty(p)).join("/");
  }

  function isOpen(file: Directory | LedgerFile) {
    const fullPath = join([path, file.name]);
    return selectedFileName?.startsWith(fullPath);
  }
</script>

<ul class:ledger-file-tree={root} class:is-root={root}>
  {#each files as file}
    {#if file.type != "directory"}
      <li class="file-item">
        <a
          href="#/"
          role="button"
          onclick={(e) => { e.preventDefault(); handleSelect(file); }}
          class="file-link"
          class:is-active={file.name == selectedFileName}
        >
          <span class="icon is-small file-icon">
            <i class="fa-regular fa-file-lines"></i>
          </span>
          <span title={fileName(file.name)} class="paisa-truncate file-name">{fileName(file.name)}</span>
          {#if file.name == selectedFileName && hasUnsavedChanges}
            <span class="ml-auto tag is-danger is-small is-light unsaved-tag">unsaved</span>
          {/if}
        </a>
      </li>
    {:else}
      <li class="folder-item">
        <details open={isOpen(file)} class="folder-details">
          <summary class="folder-summary">
            <span class="icon is-small folder-icon">
              <i class="fa-regular fa-folder"></i>
            </span>
            <span title={file.name} class="paisa-truncate folder-name">{file.name}</span>
          </summary>
          <div class="folder-content">
            <FileTree
              path={join([path, file.name])}
              on:select={(e) => dispatch("select", e.detail)}
              root={false}
              files={file.children}
              {selectedFileName}
              {hasUnsavedChanges}
            />
          </div>
        </details>
      </li>
    {/if}
  {/each}
</ul>

<style lang="scss">
  ul.ledger-file-tree {
    list-style: none;
    margin: 0;
    padding: 0;

    &:not(.is-root) {
      margin-left: var(--paisa-space-2);
      border-left: 1px solid var(--paisa-border-subtle);
      padding-left: var(--paisa-space-2);
    }
  }

  .file-item,
  .folder-item {
    margin-bottom: 2px;
  }

  .file-link {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: 0.35rem 0.5rem;
    border-radius: var(--paisa-radius-sm);
    color: var(--paisa-text-secondary);
    font-size: var(--paisa-font-size-xs);
    font-family: var(--paisa-font-mono);
    text-decoration: none;
    transition: all var(--paisa-transition-fast);
    border-left: 2px solid transparent;

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-text-primary);
    }

    &.is-active {
      background-color: var(--paisa-brand-primary-light);
      color: var(--paisa-brand-primary);
      font-weight: var(--paisa-font-weight-medium);
      border-left-color: var(--paisa-brand-primary);

      .file-icon {
        color: var(--paisa-brand-primary);
      }
    }
  }

  .file-icon,
  .folder-icon {
    font-size: 0.8rem;
    color: var(--paisa-text-muted);
    transition: color var(--paisa-transition-fast);
  }

  .file-name,
  .folder-name {
    flex: 1;
    min-width: 0;
  }

  .unsaved-tag {
    font-size: 0.65rem;
    height: 1.1rem;
    padding: 0 0.35rem;
    font-family: var(--paisa-font-sans);
    font-weight: var(--paisa-font-weight-semibold);
  }

  .folder-details {
    summary.folder-summary {
      display: flex;
      align-items: center;
      gap: var(--paisa-space-2);
      padding: 0.35rem 0.5rem;
      border-radius: var(--paisa-radius-sm);
      color: var(--paisa-text-secondary);
      font-size: var(--paisa-font-size-xs);
      font-weight: var(--paisa-font-weight-medium);
      cursor: pointer;
      user-select: none;
      list-style: none;
      transition: all var(--paisa-transition-fast);

      &::-webkit-details-marker {
        display: none;
      }

      &:hover {
        background-color: var(--paisa-surface-hover);
        color: var(--paisa-text-primary);

        .folder-icon {
          color: var(--paisa-text-primary);
        }
      }
    }

    &[open] > summary.folder-summary .folder-icon i {
      &::before {
        content: "\f07c"; /* fa-folder-open */
      }
    }
  }

  .folder-content {
    margin-top: 2px;
  }
</style>

