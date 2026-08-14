<script lang="ts">
  import FileTree from './FileTree.svelte';
  import { preventDefault } from 'svelte/legacy';

  import type { Directory, LedgerFile } from "$lib/core/utils";
  import _ from "lodash";
  import { createEventDispatcher } from "svelte";

  interface Props {
    files: Array<Directory | LedgerFile>;
    path: string;
    selectedFileName: string;
    hasUnsavedChanges: boolean;
    root?: boolean;
  }

  let {
    files,
    path,
    selectedFileName,
    hasUnsavedChanges,
    root = true
  }: Props = $props();

  const dispatch = createEventDispatcher();

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
      <li>
        <a
          href="#/"
          role="button"
          onclick={preventDefault(() => dispatch("select", file))}
          class:is-active={file.name == selectedFileName}
        >
          <span class="icon is-small">
            <i class="fa-regular fa-file-lines"></i>
          </span>
          <span title={fileName(file.name)} class="paisa-truncate">{fileName(file.name)}</span>
          {#if file.name == selectedFileName && hasUnsavedChanges}
            <span class="ml-1 tag is-danger">unsaved</span>
          {/if}
        </a>
      </li>
    {:else}
      <li>
        <details open={isOpen(file)}>
          <summary>
            <span class="icon is-small">
              <i class="fa-regular fa-folder"></i>
            </span>
            <span title={file.name} class="paisa-truncate">{file.name}</span>
          </summary>
          <FileTree
            path={join([path, file.name])}
            on:select={(e) => dispatch("select", e.detail)}
            root={false}
            files={file.children}
            {selectedFileName}
            {hasUnsavedChanges}
          />
        </details>
      </li>
    {/if}
  {/each}
</ul>
