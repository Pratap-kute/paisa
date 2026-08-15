<script lang="ts">
  import {
    createEditor,
    editorState,
    focus,
    moveToEnd,
    moveToLine,
    updateContent
  } from "$lib/editors/editor";
  import { insertTab } from "@codemirror/commands";
  import { ajax, buildDirectoryTree, type LedgerFile } from "$lib/core/utils";
  import { redo, undo } from "@codemirror/commands";
  import type { KeyBinding, EditorView } from "@codemirror/view";
  import * as toast from "$lib/core/toast";
  import { format } from "$lib/ledger/journal";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import FileTree from "$lib/components/ledger/FileTree.svelte";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { page } from "$app/stores";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let editorDom: Element | undefined = $state();
  let editor: EditorView | undefined;
  let filesMap: Record<string, LedgerFile> = $state({});
  let selectedFile: LedgerFile = $state(null);
  let accounts: string[] = $state([]);
  let commodities: string[] = $state([]);
  let payees: string[] = $state([]);
  let selectedVersion: string = $state(null);
  let lineNumber = $state(0);

  function command(fn: Function) {
    return () => {
      fn();
      return true;
    };
  }

  function undoEdit() {
    undo(editor);
  }

  function redoEdit() {
    redo(editor);
  }

  const keybindings: readonly KeyBinding[] = [
    { key: "Tab", run: insertTab },
    {
      key: "Ctrl-s",
      run: command(save),
      preventDefault: true
    },
    {
      key: "Ctrl-I",
      run: command(pretty),
      preventDefault: true
    }
  ];

  let cancelled = false;
  beforeNavigate(async ({ cancel }) => {
    if ($editorState.hasUnsavedChanges) {
      const confirmed = confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmed) {
        cancel();
        cancelled = true;
      } else {
        $editorState = _.assign({}, $editorState, { hasUnsavedChanges: false });
      }
    }
  });

  async function navigate(url: string) {
    await goto(url, { noScroll: true });
    if (cancelled) {
      cancelled = false;
      return false;
    }
    return true;
  }

  onMount(async () => {
    loadFiles(data.name);
    const line = _.toNumber($page.url.hash.substring(1));
    if (_.isNumber(line)) {
      lineNumber = line;
    }
  });

  async function loadFiles(selectedFileName: string) {
    let files;
    ({ files, accounts, commodities, payees } = await ajax("/api/editor/files"));
    filesMap = _.fromPairs(_.map(files, (f) => [f.name, f]));
    if (!_.isEmpty(files)) {
      selectedFile = _.find(files, (f) => f.name == selectedFileName) || files[0];
    }
  }

  async function selectFile(file: LedgerFile) {
    const success = await navigate(`/ledger/editor/${encodeURIComponent(file.name)}`);
    if (success) {
      selectedFile = file;
    }
  }

  async function revert(version: string) {
    const { file } = await ajax("/api/editor/file", {
      method: "POST",
      body: JSON.stringify({ name: version }),
      background: true
    });

    updateContent(editor, file.content);
  }

  async function pretty() {
    const formatted = format(editor.state.doc.toString());
    if (formatted != editor.state.doc.toString()) {
      updateContent(editor, formatted);
    }
  }

  async function deleteBackups() {
    const { file } = await ajax("/api/editor/file/delete_backups", {
      method: "POST",
      body: JSON.stringify({ name: selectedFile.name }),
      background: true
    });

    selectedFile.versions = file.versions;
  }

  async function save() {
    const doc = editor.state.doc;
    const { errors, saved, file, message } = await ajax("/api/editor/save", {
      method: "POST",
      body: JSON.stringify({ name: selectedFile.name, content: doc.toString() }),
      background: true
    });

    if (!saved) {
      toast.toast({
        message: `Failed to save ${selectedFile.name}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
      if (!_.isEmpty(errors)) {
        moveToLine(editor, errors[0].line_from);
      }
    } else {
      toast.toast({
        message: `Saved ${selectedFile.name}`,
        type: "is-success"
      });
      filesMap[file.name] = file;
      selectedFile = file;
      selectedVersion = null;
      $editorState = _.assign({}, $editorState, { hasUnsavedChanges: false });
    }
  }

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  $effect(() => {
    if (selectedFile && editorDom) {
      if (!editor || editor.state.doc.toString() != selectedFile.content) {
        if (editor) {
          editor.destroy();
        }

        editor = createEditor(selectedFile.content, editorDom, {
          keybindings,
          autocompletions: {
            string: accounts,
            strong: payees,
            unit: commodities
          }
        });
        if (lineNumber > 0) {
          moveToLine(editor, lineNumber, true);
          focus(editor);
          lineNumber = 0;
        } else {
          moveToEnd(editor);
        }
      }
    }
  });

  let modalOpen = $state(false);
  function openCreateModal() {
    modalOpen = true;
  }

  async function createFile(destinationFile: string) {
    const { saved, message } = await ajax("/api/editor/save", {
      method: "POST",
      body: JSON.stringify({ name: destinationFile, content: "", operation: "create" }),
      background: true
    });

    if (saved) {
      toast.toast({
        message: `Created <b><a href="/ledger/editor/${encodeURIComponent(
          destinationFile
        )}">${destinationFile}</a></b>`,
        type: "is-success",
        duration: 5000
      });

      const success = await navigate(`/ledger/editor/${encodeURIComponent(destinationFile)}`);
      if (success) {
        await loadFiles(destinationFile);
      }
    } else {
      toast.toast({
        message: `Failed to create ${destinationFile}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
    }
  }

  let sidebarOpen = $state(true);
  let outputOpen = $state(true);
  let copiedOutput = $state(false);

  async function copyOutput() {
    if ($editorState.output) {
      await navigator.clipboard.writeText($editorState.output);
      copiedOutput = true;
      toast.toast({ message: "Output copied to clipboard", type: "is-info", duration: 2000 });
      setTimeout(() => { copiedOutput = false; }, 2000);
    }
  }
</script>

<FileModal bind:open={modalOpen} on:save={(e) => createFile(e.detail)} label="Create" help="" />

<Page width="fluid">
  <Section class="paisa-pb-0">
    <!-- Top Workspace Toolbar -->
    <div class="paisa-editor-toolbar-card">
      <div class="paisa-toolbar-left">
        <Button
          variant="ghost"
          size="sm"
          class="paisa-sidebar-toggle-btn"
          onclick={() => sidebarOpen = !sidebarOpen}
          ariaLabel={sidebarOpen ? "Hide file explorer" : "Show file explorer"}
          title={sidebarOpen ? "Hide file explorer" : "Show file explorer"}
        >
          {#snippet icon()}
            <i class="fa-solid fa-bars-staggered"></i>
          {/snippet}
        </Button>

        <div class="paisa-active-file-indicator">
          <span class="icon is-small paisa-active-file-icon">
            <i class="fa-regular fa-file-code"></i>
          </span>
          <span class="paisa-active-file-name" title={selectedFile?.name}>{selectedFile?.name || "No file selected"}</span>
          {#if $editorState.hasUnsavedChanges}
            <Badge variant="warning" size="sm" rounded dot>Unsaved</Badge>
          {/if}
        </div>
      </div>

      <div class="paisa-toolbar-center">
        <div class="paisa-action-btn-group">
          <Button
            variant={$editorState.hasUnsavedChanges ? "primary" : "secondary"}
            size="sm"
            disabled={$editorState.hasUnsavedChanges === false}
            onclick={() => save()}
            title="Save file (Ctrl+S)"
          >
            {#snippet icon()}
              <i class="fas fa-floppy-disk"></i>
            {/snippet}
            <span>Save</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onclick={() => pretty()}
            title="Format ledger entries (Ctrl+I)"
          >
            {#snippet icon()}
              <i class="fas fa-code"></i>
            {/snippet}
            <span>Prettify</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={$editorState.undoDepth === 0}
            onclick={undoEdit}
            title="Undo edit (Ctrl+Z)"
            ariaLabel="Undo edit"
          >
            {#snippet icon()}
              <i class="fas fa-arrow-rotate-left"></i>
            {/snippet}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={$editorState.redoDepth === 0}
            onclick={redoEdit}
            title="Redo edit (Ctrl+Y)"
            ariaLabel="Redo edit"
          >
            {#snippet icon()}
              <i class="fas fa-arrow-rotate-right"></i>
            {/snippet}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={$editorState.hasUnsavedChanges}
            onclick={() => openCreateModal()}
            title="Create new ledger file"
          >
            {#snippet icon()}
              <i class="fas fa-file-circle-plus"></i>
            {/snippet}
            <span>New</span>
          </Button>
        </div>

        {#if !_.isEmpty(selectedFile?.versions)}
          <div class="paisa-version-control-group">
            <span class="icon is-small paisa-version-icon" title="File version history">
              <i class="fas fa-clock-rotate-left"></i>
            </span>
            <div class="select is-small paisa-version-select">
              <select bind:value={selectedVersion}>
                <option value={null} disabled selected>Select backup...</option>
                {#each selectedFile.versions as version}
                  <option value={version}>{version}</option>
                {/each}
              </select>
            </div>
            <Button
              variant="outline"
              size="xs"
              disabled={!selectedVersion}
              onclick={() => revert(selectedVersion)}
              title="Revert to selected version"
            >
              Revert
            </Button>
            <Button
              variant="ghost"
              size="xs"
              ariaLabel="Clear all backup versions"
              title="Clear backup history"
              onclick={() => deleteBackups()}
            >
              {#snippet icon()}
                <i class="fas fa-trash-can"></i>
              {/snippet}
            </Button>
          </div>
        {/if}
      </div>

      <div class="paisa-toolbar-right">
        {#if $editorState.errors.length > 0}
          <button
            type="button"
            class="paisa-diag-badge error"
            onclick={() => moveToLine(editor, $editorState.errors[0].line_from, true)}
            title="Click to jump to error line"
          >
            <span class="paisa-diag-dot error"></span>
            <span>{$editorState.errors.length} error{$editorState.errors.length > 1 ? "s" : ""}</span>
          </button>
        {:else}
          <div class="paisa-diag-badge valid" title="Ledger syntax is valid">
            <span class="paisa-diag-dot valid"></span>
            <span>Valid</span>
          </div>
        {/if}

        {#if !_.isEmpty($editorState.output)}
          <Button
            variant={outputOpen ? "secondary" : "ghost"}
            size="sm"
            onclick={() => outputOpen = !outputOpen}
            title={outputOpen ? "Hide balance panel" : "Show balance panel"}
          >
            {#snippet icon()}
              <i class="fas fa-table-columns"></i>
            {/snippet}
            <span>Output</span>
          </Button>
        {/if}
      </div>
    </div>

    <!-- Main Workspace 3-Pane Body -->
    <div
      class="paisa-editor-workspace"
      class:has-no-sidebar={!sidebarOpen}
      class:has-no-output={!outputOpen || _.isEmpty($editorState.output)}
    >
      <!-- Sidebar Pane -->
      {#if sidebarOpen}
        <aside class="paisa-editor-sidebar-pane">
          <div class="paisa-pane-header">
            <span class="paisa-pane-title">
              <i class="fa-regular fa-folder-open mr-1"></i>
              FILES
            </span>
            <span class="tag is-rounded is-light is-small paisa-file-count">
              {_.values(filesMap).length}
            </span>
            <button
              class="paisa-pane-action-btn ml-auto"
              title="Create new file"
              onclick={() => openCreateModal()}
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="paisa-pane-content paisa-filetree-scroll">
            <FileTree
              path=""
              on:select={(e) => selectFile(e.detail)}
              files={buildDirectoryTree(_.values(filesMap))}
              selectedFileName={selectedFile?.name}
              hasUnsavedChanges={$editorState.hasUnsavedChanges}
            />
          </div>
        </aside>
      {/if}

      <!-- Center Editor Pane -->
      <main class="paisa-editor-main-pane">
        <div class="paisa-pane-header paisa-editor-tab-header">
          <div class="paisa-editor-tab active">
            <i class="fa-regular fa-file-lines mr-1"></i>
            <span class="paisa-tab-filename">{selectedFile ? _.last(selectedFile.name.split("/")) : "editor"}</span>
            {#if $editorState.hasUnsavedChanges}
              <span class="paisa-tab-dirty-indicator" title="Unsaved changes">●</span>
            {/if}
          </div>
          <div class="paisa-editor-tab-actions ml-auto">
            <Badge variant="neutral" size="sm">Ledger</Badge>
          </div>
        </div>
        <div class="paisa-pane-content paisa-editor-cm-wrapper">
          <div class="editor" bind:this={editorDom}></div>
        </div>
      </main>

      <!-- Right Output Pane -->
      {#if outputOpen && !_.isEmpty($editorState.output)}
        <section class="paisa-editor-output-pane">
          <div class="paisa-pane-header">
            <span class="paisa-pane-title">
              <i class="fas fa-scale-balanced mr-1"></i>
              BALANCES & DIAGNOSTICS
            </span>
            <button
              class="paisa-pane-action-btn ml-auto"
              title="Copy output to clipboard"
              onclick={copyOutput}
            >
              <i class={copiedOutput ? "fas fa-check" : "fa-regular fa-copy"}></i>
            </button>
          </div>
          <div class="paisa-pane-content paisa-output-scroll">
            <pre class="paisa-output-pre">{$editorState.output}</pre>
          </div>
        </section>
      {/if}
    </div>
  </Section>
</Page>

<style lang="scss">
  /* Top Workspace Toolbar */
  .paisa-editor-toolbar-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--paisa-space-3);
    padding: var(--paisa-space-2) var(--paisa-space-3);
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    margin-bottom: var(--paisa-space-3);
    box-shadow: var(--paisa-shadow-sm);
  }

  .paisa-toolbar-left,
  .paisa-toolbar-center,
  .paisa-toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
  }

  .paisa-active-file-indicator {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: 0.25rem 0.5rem;
    background-color: var(--paisa-surface-muted);
    border-radius: var(--paisa-radius-sm);
    border: 1px solid var(--paisa-border-subtle);
  }

  .paisa-active-file-icon {
    color: var(--paisa-brand-primary);
  }

  .paisa-active-file-name {
    font-family: var(--paisa-font-mono);
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-text-primary);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-action-btn-group {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-1);
    background-color: var(--paisa-surface-muted);
    padding: 2px;
    border-radius: var(--paisa-radius-md);
    border: 1px solid var(--paisa-border-subtle);
  }

  .paisa-version-control-group {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-1);
    padding-left: var(--paisa-space-2);
    border-left: 1px solid var(--paisa-border-default);
  }

  .paisa-version-icon {
    color: var(--paisa-text-muted);
    font-size: 0.8rem;
  }

  .paisa-version-select select {
    font-family: var(--paisa-font-mono);
    font-size: var(--paisa-font-size-xs);
    background-color: var(--paisa-surface-bg);
    border-color: var(--paisa-border-default);
    color: var(--paisa-text-primary);
    max-width: 170px;
  }

  .paisa-diag-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: 0.3rem 0.6rem;
    border-radius: var(--paisa-radius-full);
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    border: 1px solid transparent;
    cursor: default;
    transition: all var(--paisa-transition-fast);

    &.valid {
      background-color: var(--paisa-success-light);
      color: var(--paisa-success);
      border-color: rgba(34, 197, 94, 0.2);
    }

    &.error {
      background-color: var(--paisa-danger-light);
      color: var(--paisa-danger);
      border-color: rgba(239, 68, 68, 0.2);
      cursor: pointer;

      &:hover {
        background-color: var(--paisa-danger);
        color: var(--paisa-text-inverse);
      }
    }
  }

  .paisa-diag-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;

    &.valid {
      background-color: var(--paisa-success);
    }

    &.error {
      background-color: var(--paisa-danger);
    }
  }

  /* Main Workspace 3-Pane Layout */
  .paisa-editor-workspace {
    display: grid;
    grid-template-columns: minmax(220px, 240px) minmax(0, 1fr) minmax(280px, 340px);
    gap: var(--paisa-space-3);
    height: calc(100vh - 136px);
    min-height: 520px;
    width: 100%;

    &.has-no-sidebar {
      grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
    }

    &.has-no-output {
      grid-template-columns: minmax(220px, 240px) minmax(0, 1fr);
    }

    &.has-no-sidebar.has-no-output {
      grid-template-columns: minmax(0, 1fr);
    }

    @media screen and (max-width: 1024px) {
      grid-template-columns: minmax(200px, 220px) minmax(0, 1fr);

      .paisa-editor-output-pane {
        display: none;
      }
    }

    @media screen and (max-width: 768px) {
      grid-template-columns: 1fr;

      .paisa-editor-sidebar-pane {
        display: none;
      }
    }
  }

  /* Generic Pane Styles */
  .paisa-editor-sidebar-pane,
  .paisa-editor-main-pane,
  .paisa-editor-output-pane {
    display: flex;
    flex-direction: column;
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    box-shadow: var(--paisa-shadow-sm);
    overflow: hidden;
    min-width: 0;
  }

  .paisa-pane-header {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-2) var(--paisa-space-3);
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-default);
    min-height: 38px;
  }

  .paisa-pane-title {
    font-size: 0.725rem;
    font-weight: var(--paisa-font-weight-bold);
    letter-spacing: 0.05em;
    color: var(--paisa-text-secondary);
    text-transform: uppercase;
  }

  .paisa-file-count {
    font-size: 0.7rem;
    height: 1.2rem;
    padding: 0 0.4rem;
  }

  .paisa-pane-action-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--paisa-text-muted);
    padding: 0.2rem 0.35rem;
    border-radius: var(--paisa-radius-sm);
    font-size: 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all var(--paisa-transition-fast);

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-text-primary);
    }
  }

  .paisa-pane-content {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  /* File Tree Sidebar Scroll */
  .paisa-filetree-scroll {
    overflow-y: auto;
    padding: var(--paisa-space-2);
  }

  /* Editor Center Pane */
  .paisa-editor-tab-header {
    background-color: var(--paisa-surface-bg);
    border-bottom: 1px solid var(--paisa-border-default);
    padding: 0 var(--paisa-space-2);
  }

  .paisa-editor-tab {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: 0.45rem 0.75rem;
    font-family: var(--paisa-font-mono);
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-text-primary);
    background-color: var(--paisa-surface-card);
    border-bottom: 2px solid var(--paisa-brand-primary);
    height: 100%;
  }

  .paisa-tab-filename {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-tab-dirty-indicator {
    color: var(--paisa-warning);
    font-size: 0.75rem;
    line-height: 1;
  }

  .paisa-editor-cm-wrapper {
    height: calc(100% - 38px);
    overflow: auto;

    :global(.editor),
    :global(.cm-editor) {
      height: 100%;
      min-height: 100%;
      border: none;
    }

    :global(.cm-scroller) {
      height: 100%;
      padding: var(--paisa-space-2) 0;
    }
  }

  /* Output Right Pane */
  .paisa-output-scroll {
    overflow-y: auto;
    background-color: var(--paisa-surface-bg);
  }

  .paisa-output-pre {
    background-color: transparent;
    color: var(--paisa-text-primary);
    font-family: var(--paisa-font-mono);
    font-size: 0.8rem;
    line-height: 1.45;
    padding: var(--paisa-space-3);
    margin: 0;
    white-space: pre;
    word-break: normal;
    border: none;
  }
</style>

