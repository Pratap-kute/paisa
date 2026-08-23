<script lang="ts">
  import {
    createEditor,
    editorState,
    focus,
    moveToEnd,
    moveToLine,
    updateContent,
  } from "$lib/editors/editor";
  import { insertTab } from "@codemirror/commands";
  import { ajax, buildDirectoryTree, type LedgerFile } from "$lib/core/utils";
  import { redo, undo } from "@codemirror/commands";
  import type { KeyBinding, EditorView } from "@codemirror/view";
  import * as toast from "$lib/core/toast";
  import { format } from "$lib/ledger/journal";
  import { isNumber, last } from "es-toolkit";
  import { onDestroy, onMount } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import FileTree from "$lib/components/ledger/FileTree.svelte";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { page } from "$app/stores";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import LedgerBalance from "$lib/components/ledger/LedgerBalance.svelte";
import { assign, find, fromPairs, isEmpty, map, toNumber, values } from "$lib/core/collection";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let editorDom: Element | undefined = $state();
  let editor: EditorView | undefined;
  let filesMap: Record<string, LedgerFile> = $state({});
  let selectedFile: LedgerFile | null = $state(null);
  let accounts: string[] = $state([]);
  let commodities: string[] = $state([]);
  let payees: string[] = $state([]);
  let selectedVersion = $state("");
  let lineNumber = $state(0);

  function command(fn: Function) {
    return () => {
      fn();
      return true;
    };
  }

  function undoEdit() {
    if (editor) undo(editor);
  }

  function redoEdit() {
    if (editor) redo(editor);
  }

  const keybindings: readonly KeyBinding[] = [
    { key: "Tab", run: insertTab },
    {
      key: "Ctrl-s",
      run: command(save),
      preventDefault: true,
    },
    {
      key: "Ctrl-I",
      run: command(pretty),
      preventDefault: true,
    },
  ];

  let cancelled = false;
  beforeNavigate(async ({ cancel }) => {
    if ($editorState.hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) {
        cancel();
        cancelled = true;
      } else {
        $editorState = assign({}, $editorState, { hasUnsavedChanges: false });
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

  onMount(() => {
    loadFiles(data.name);
    const line = toNumber($page.url.hash.substring(1));
    if (isNumber(line)) {
      lineNumber = line;
    }
  });

  async function loadFiles(selectedFileName: string) {
    let files;
    ({ files, accounts, commodities, payees } =
      await ajax("/api/editor/files"));
    filesMap = fromPairs(map(files, (f: LedgerFile) => [f.name, f]));
    if (!isEmpty(files)) {
      selectedFile =
        find(files, (f: LedgerFile) => f.name == selectedFileName) ||
        files[0];
    }
  }

  async function selectFile(file: LedgerFile) {
    const success = await navigate(
      `/ledger/editor/${encodeURIComponent(file.name)}`,
    );
    if (success) {
      selectedFile = file;
    }
  }

  async function revert(version: string) {
    const { file } = await ajax("/api/editor/file", {
      method: "POST",
      body: JSON.stringify({ name: version }),
      background: true,
    });

    if (editor) updateContent(editor, file.content);
  }

  async function pretty() {
    if (!editor) return;
    const formatted = format(editor.state.doc.toString());
    if (formatted != editor.state.doc.toString()) {
      updateContent(editor, formatted);
    }
  }

  async function deleteBackups() {
    if (!selectedFile) return;
    const { file } = await ajax("/api/editor/file/delete_backups", {
      method: "POST",
      body: JSON.stringify({ name: selectedFile.name }),
      background: true,
    });

    selectedFile.versions = file.versions;
  }

  async function save() {
    if (!editor || !selectedFile) return;
    const doc = editor.state.doc;
    const { errors, saved, file, message } = await ajax("/api/editor/save", {
      method: "POST",
      body: JSON.stringify({
        name: selectedFile.name,
        content: doc.toString(),
      }),
      background: true,
    });

    if (!saved) {
      toast.toast({
        message: `Failed to save ${selectedFile.name}. reason: ${message}`,
        type: "is-danger",
        duration: 10000,
      });
      if (!isEmpty(errors)) {
        if (editor) moveToLine(editor, errors[0].line_from);
      }
    } else {
      toast.toast({
        message: `Saved ${selectedFile.name}`,
        type: "is-success",
      });
      filesMap[file.name] = file;
      selectedFile = file;
      selectedVersion = "";
      $editorState = assign({}, $editorState, { hasUnsavedChanges: false });
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
            unit: commodities,
          },
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
      body: JSON.stringify({
        name: destinationFile,
        content: "",
        operation: "create",
      }),
      background: true,
    });

    if (saved) {
      toast.toast({
        message: `Created <b><a href="/ledger/editor/${encodeURIComponent(
          destinationFile,
        )}">${destinationFile}</a></b>`,
        type: "is-success",
        duration: 5000,
      });

      const success = await navigate(
        `/ledger/editor/${encodeURIComponent(destinationFile)}`,
      );
      if (success) {
        await loadFiles(destinationFile);
      }
    } else {
      toast.toast({
        message: `Failed to create ${destinationFile}. reason: ${message}`,
        type: "is-danger",
        duration: 10000,
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
      toast.toast({
        message: "Output copied to clipboard",
        type: "is-info",
        duration: 2000,
      });
      setTimeout(() => {
        copiedOutput = false;
      }, 2000);
    }
  }


  let gridColsClass = $derived.by(() => {
    const hasSidebar = sidebarOpen;
    const hasOutput = outputOpen && !isEmpty($editorState.output);

    if (hasSidebar && hasOutput) {
      return "grid-cols-1 md:grid-cols-[minmax(180px,200px)_1fr_minmax(220px,280px)] lg:grid-cols-[minmax(200px,240px)_1fr_minmax(260px,340px)]";
    }
    if (hasSidebar) {
      return "grid-cols-1 md:grid-cols-[minmax(180px,220px)_1fr] lg:grid-cols-[minmax(200px,240px)_1fr]";
    }
    if (hasOutput) {
      return "grid-cols-1 md:grid-cols-[1fr_minmax(240px,320px)] lg:grid-cols-[1fr_minmax(260px,340px)]";
    }
    return "grid-cols-1";
  });
</script>

<FileModal
  bind:open={modalOpen}
  on:save={(e) => createFile(e.detail)}
  label="Create"
  help=""
/>

<Page width="fluid">
  <Section class="!pb-0">
    <div
      class="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] p-2 px-3 shadow-[var(--paisa-shadow-sm)]"
    >
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => (sidebarOpen = !sidebarOpen)}
          ariaLabel={sidebarOpen ? "Hide file explorer" : "Show file explorer"}
          title={sidebarOpen ? "Hide file explorer" : "Show file explorer"}
        >
          {#snippet icon()}
            <i class="fa-solid fa-bars-staggered"></i>
          {/snippet}
        </Button>

        <div
          class="flex items-center gap-2 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-1"
        >
          <i class="fa-regular fa-file-code text-[var(--paisa-brand-primary)]"></i>
          <span
            class="max-w-[240px] truncate font-mono text-xs font-medium text-[var(--paisa-text-primary)]"
            title={selectedFile?.name}
          >
            {selectedFile?.name || "No file selected"}
          </span>
          {#if $editorState.hasUnsavedChanges}
            <Badge variant="warning" size="sm" rounded dot>Unsaved</Badge>
          {/if}
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div
          class="flex items-center gap-1 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] p-0.5"
        >
          <Button
            variant={$editorState.hasUnsavedChanges ? "primary" : "secondary"}
            size="sm"
            onclick={save}
            disabled={!$editorState.hasUnsavedChanges}
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
            onclick={pretty}
            title="Format ledger file (Ctrl+Shift+I)"
            ariaLabel="Format document"
          >
            {#snippet icon()}
              <i class="fas fa-wand-magic-sparkles"></i>
            {/snippet}
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

        {#if !isEmpty(selectedFile?.versions)}
          <div
            class="flex items-center gap-1 border-l border-[var(--paisa-border-default)] pl-2"
          >
            <i class="fas fa-clock-rotate-left text-[0.8rem] text-[var(--paisa-text-muted)]" title="File version history"></i>
            <Select
              bind:value={selectedVersion}
              size="sm"
              class="max-w-[170px] font-mono"
            >
              <option value="" disabled>Select backup...</option>
              {#each selectedFile?.versions ?? [] as version}
                <option value={version}>{version}</option>
              {/each}
            </Select>
            <Button
              variant="outline"
              size="xs"
              disabled={!selectedVersion}
              onclick={() => {
                if (selectedVersion) revert(selectedVersion);
              }}
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

      <div class="flex items-center gap-2">
        {#if $editorState.errors.length > 0}
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(239,68,68,0.2)] bg-[var(--paisa-danger-light)] px-2.5 py-1 text-xs font-semibold text-[var(--paisa-danger)] transition-colors hover:bg-[var(--paisa-danger)] hover:text-[var(--paisa-text-inverse)]"
            onclick={() => {
              if (editor) moveToLine(editor, $editorState.errors[0].line_from, true);
            }}
            title="Click to jump to error line"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-danger)]"></span>
            <span
              >{$editorState.errors.length} error{$editorState.errors.length > 1 ? "s" : ""}</span
            >
          </button>
        {:else}
          <div
            class="inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.2)] bg-[var(--paisa-success-light)] px-2.5 py-1 text-xs font-semibold text-[var(--paisa-success)]"
            title="Ledger syntax is valid"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-success)]"></span>
            <span>Valid</span>
          </div>
        {/if}

        {#if !isEmpty($editorState.output)}
          <Button
            variant={outputOpen ? "secondary" : "ghost"}
            size="sm"
            onclick={() => (outputOpen = !outputOpen)}
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

    <div class="grid h-full min-h-0 w-full flex-1 gap-3 {gridColsClass}">
      {#if sidebarOpen}
        <aside
          class="flex min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)] max-md:hidden"
        >
          <div
            class="flex min-h-[38px] items-center gap-2 border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-muted)] px-3 py-2"
          >
            <span class="text-[0.725rem] font-bold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
              <i class="fa-regular fa-folder-open mr-1"></i>
              FILES
            </span>
            <Badge variant="neutral" size="sm" rounded>{values(filesMap).length}</Badge>
            <button
              type="button"
              class="ml-auto inline-flex items-center justify-center rounded-[var(--paisa-radius-sm)] p-1 text-[0.75rem] text-[var(--paisa-text-muted)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-text-primary)]"
              title="Create new file"
              onclick={() => openCreateModal()}
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="relative flex-1 overflow-y-auto p-2">
            <FileTree
              path=""
              on:select={(e) => selectFile(e.detail)}
              files={buildDirectoryTree(values(filesMap))}
              selectedFileName={selectedFile?.name ?? ""}
              hasUnsavedChanges={$editorState.hasUnsavedChanges}
            />
          </div>
        </aside>
      {/if}

      <main
        class="flex min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)]"
      >
        <div
          class="flex min-h-[38px] items-center border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-bg)] px-2"
        >
          <div
            class="flex h-full items-center gap-2 border-b-2 border-[var(--paisa-brand-primary)] bg-[var(--paisa-surface-card)] px-3 py-2 font-mono text-xs font-medium text-[var(--paisa-text-primary)]"
          >
            <i class="fa-regular fa-file-lines mr-1"></i>
            <span class="max-w-[200px] truncate">
              {selectedFile ? last(selectedFile.name.split("/")) : "editor"}
            </span>
            {#if $editorState.hasUnsavedChanges}
              <span class="text-[0.75rem] leading-none text-[var(--paisa-warning)]" title="Unsaved changes"
                >●</span
              >
            {/if}
          </div>
          <div class="ml-auto px-2">
            <Badge variant="neutral" size="sm">Ledger</Badge>
          </div>
        </div>
        <div
          class="relative flex-1 overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:min-h-full [&_.cm-editor]:border-0 [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:py-2 [&_.editor]:h-full"
        >
          <div class="editor h-full" bind:this={editorDom}></div>
        </div>
      </main>

      {#if outputOpen && !isEmpty($editorState.output)}
        <section
          class="flex min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)] max-md:hidden"
        >
          <div
            class="flex min-h-[38px] items-center gap-2 border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-muted)] px-3 py-2"
          >
            <span
              class="text-[0.725rem] font-bold uppercase tracking-wider text-[var(--paisa-text-secondary)]"
              title="hledger CLI validation balance report"
            >
              <i class="fas fa-scale-balanced mr-1"></i>
              LEDGER BALANCE
            </span>

            <a
              href="/assets/investment"
              class="ml-auto inline-flex items-center rounded-full bg-[var(--paisa-brand-primary-light)] px-2 py-0.5 text-[0.7rem] font-medium text-[var(--paisa-brand-primary)] no-underline transition-colors hover:bg-[var(--paisa-brand-primary)] hover:text-[var(--paisa-text-inverse)]"
              title="Open Portfolio Dashboard with full INR valuations, charts, and gain/loss analytics"
            >
              <i class="fas fa-chart-pie mr-1"></i>
              <span>Portfolio ↗</span>
            </a>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-[var(--paisa-radius-sm)] p-1 text-[0.75rem] text-[var(--paisa-text-muted)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-text-primary)]"
              title="Copy raw output to clipboard"
              onclick={copyOutput}
            >
              <i class={copiedOutput ? "fas fa-check" : "fa-regular fa-copy"}></i>
            </button>
          </div>

          <div class="relative flex-1 overflow-hidden">
            <LedgerBalance output={$editorState.output} />
          </div>
        </section>
      {/if}
    </div>
  </Section>
</Page>
