<script lang="ts">
import FileTree from "./FileTree.svelte";

import type { Directory, LedgerFile } from "$lib/domain/ledger";
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
  onselect,
}: Props = $props();

const dispatch = createEventDispatcher();

function handleSelect(file: LedgerFile | Directory) {
  onselect?.(file);
  dispatch("select", file);
}

function fileName(path: string) {
  return path.split("/").at(-1) ?? "";
}

function join(paths: string[]) {
  return paths.filter(Boolean).join("/");
}

function isOpen(file: Directory | LedgerFile) {
  const fullPath = join([path, file.name]);
  return selectedFileName?.startsWith(fullPath);
}
</script>

<ul class="ledger-file-tree" class:is-root={root}>
  {#each files as file}
    {#if file.type === "directory"}
      <li class="folder-item">
        <details open={isOpen(file)} class="folder-details">
          <summary class="folder-summary">
            <span class="chevron" aria-hidden="true">
              <i class="fa-solid fa-chevron-right"></i>
            </span>

            <span class="folder-name" title={file.name}>
              {file.name}
            </span>
          </summary>

          <div class="folder-content">
            <FileTree
              path={join([path, file.name])}
              root={false}
              files={file.children}
              {selectedFileName}
              {hasUnsavedChanges}
              on:select={(e) => dispatch("select", e.detail)}
            />
          </div>
        </details>
      </li>
    {:else}
      <li class="file-item">
        <a
          href="#/"
          class="ledger-file-link"
          class:is-active={file.name === selectedFileName}
          onclick={(e) => {
            e.preventDefault();
            handleSelect(file);
          }}
        >
          <span
            class="file-name"
            title={fileName(file.name)}
          >
            {fileName(file.name)}
          </span>

          {#if file.name === selectedFileName && hasUnsavedChanges}
            <span
              class="unsaved-dot"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            ></span>
          {/if}
        </a>
      </li>
    {/if}
  {/each}
</ul>

<style>
ul.ledger-file-tree {
  margin: 0;
  padding: 0;
  list-style: none;

  &:not(.is-root) {
    margin-left: 0.8rem;
  }
}

.folder-item,
.file-item {
  margin: 0;
  padding: 0;
}

.folder-summary,
.ledger-file-link {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 30px;
  border-radius: var(--paisa-radius-sm);

  color: var(--paisa-text-secondary);
  font-size: var(--paisa-font-size-xs);

  transition:
    background-color var(--paisa-transition-fast),
    color var(--paisa-transition-fast);
}

.folder-summary {
  gap: 0.35rem;
  padding: 0.3rem 0.5rem;

  cursor: pointer;
  user-select: none;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  &::marker {
    content: "";
  }

  &:hover {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-text-primary);

    .chevron {
      color: var(--paisa-text-primary);
    }
  }
}

.chevron {
  display: inline-flex;
  width: 0.6rem;
  height: 0.8rem;
  flex: 0 0 0.6rem;

  align-items: center;
  justify-content: center;

  color: var(--paisa-text-muted);
  font-size: 0.5rem;
  line-height: 1;

  transition:
    transform var(--paisa-transition-fast),
    color var(--paisa-transition-fast);
}

.folder-details[open] > .folder-summary .chevron {
  transform: rotate(90deg);
}

.folder-name {
  min-width: 0;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-family: var(--paisa-font-sans);
  font-weight: var(--paisa-font-weight-medium);
}

.folder-content {
  margin: 1px 0;
}

/*
 * Files intentionally have no icon.
 *
 * Their left padding roughly aligns filenames with folder labels
 * while keeping the tree visually quiet.
 *
 * Important: do not use the class name ".file" here because Bulma
 * already owns that class for its file-upload component.
 */
.ledger-file-link {
  gap: 0.35rem;
  padding: 0.3rem 0.5rem 0.3rem 1.45rem;

  text-decoration: none;

  &:hover {
    background-color: var(--paisa-surface-hover);
    color: var(--paisa-text-primary);
  }

  &.is-active {
    background-color: var(--paisa-brand-primary-light);
    color: var(--paisa-brand-primary);
    font-weight: var(--paisa-font-weight-medium);

    box-shadow: inset 2px 0 0 var(--paisa-brand-primary);
  }
}

.file-name {
  min-width: 0;
  flex: 1;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-family: var(--paisa-font-mono);
  font-size: 0.7rem;
}

.unsaved-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;

  border-radius: 50%;
  background-color: var(--paisa-warning);
}
</style>
