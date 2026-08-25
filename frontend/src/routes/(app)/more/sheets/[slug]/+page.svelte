<script lang="ts">
  import { api } from "$lib/api";
  import { buildDirectoryTree } from "$lib/shared/utils/tree";
import { formatFloatUptoPrecision } from "$lib/shared/formatters/currency";
import type { LedgerFile, Posting } from "$lib/domain/ledger";
import type { SheetFile } from "$lib/domain/ledger";
import { createEditor, sheetEditorState } from "$lib/features/editor/sheet_editor";
  import { focus, moveToLine, updateContent } from "$lib/features/editor/runtime";
  import { redo, undo } from "@codemirror/commands";
  import type { KeyBinding, EditorView } from "@codemirror/view";
  import * as toast from "$lib/shared/ui/toast";
  import { isNumber } from "es-toolkit";
  import { onMount } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import FileTree from "$lib/features/ledger/components/FileTree.svelte";
  import FileModal from "$lib/features/ledger/components/FileModal.svelte";
  import { page } from "$app/stores";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import Button from "$lib/shared/ui/Button.svelte";
  import Badge from "$lib/shared/ui/Badge.svelte";
  import Card from "$lib/shared/ui/Card.svelte";
  import Select from "$lib/shared/ui/Select.svelte";
import { assign, find, fromPairs, isEmpty, map, toNumber, values } from "$lib/shared/utils/collection";

  let ledgerFiles: LedgerFile[] = $state([]);
  let accounts: string[] = $state([]);
  let commodities: string[] = $state([]);

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let editorDom: Element = $state();
  let editor: EditorView = $state();
  let filesMap: Record<string, SheetFile> = $state({});
  let postings: Posting[] = $state([]);
  let selectedFile: SheetFile = $state(null);
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
    {
      key: "Ctrl-s",
      run: command(save),
      preventDefault: true,
    },
  ];

  let cancelled = false;
  beforeNavigate(async ({ cancel }) => {
    if ($sheetEditorState.hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) {
        cancel();
        cancelled = true;
      } else {
        $sheetEditorState = assign({}, $sheetEditorState, {
          hasUnsavedChanges: false,
        });
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
    const line = toNumber($page.url.hash.substring(1));
    if (isNumber(line)) {
      lineNumber = line;
    }
  });

  async function loadFiles(selectedFileName: string) {
    let files;
    ({
      files: ledgerFiles,
      accounts,
      commodities,
    } = await api.editor.getEditorFiles() as unknown as {
      files: LedgerFile[];
      accounts: string[];
      commodities: string[];
    });
    ({ files, postings } = await api.sheets.getSheetFiles() as unknown as {
      files: SheetFile[];
      postings: Posting[];
    });
    filesMap = fromPairs(map(files, (f) => [f.name, f]));
    if (!isEmpty(files)) {
      selectedFile =
        find(files, (f) => f.name == selectedFileName) || files[0];
    }
  }

  async function selectFile(file: SheetFile) {
    const success = await navigate(
      `/more/sheets/${encodeURIComponent(file.name)}`,
    );
    if (success) {
      selectedFile = file;
    }
  }

  async function revert(version: string) {
    const { file } = await api.sheets.getSheetFile({ name: version }) as unknown as { file: SheetFile };

    updateContent(editor, file.content);
  }

  async function deleteBackups() {
    const { file } = await api.sheets.deleteSheetBackups({ name: selectedFile.name }) as unknown as { file: SheetFile };

    selectedFile.versions = file.versions;
  }

  async function save() {
    const doc = editor.state.doc;
    const { saved, file, message } = await api.sheets.saveSheetFile({
      name: selectedFile.name,
      content: doc.toString(),
    }) as unknown as { saved: boolean; file: SheetFile; message: string };

    if (!saved) {
      toast.toast({
        message: `Failed to save ${selectedFile.name}. reason: ${message}`,
        type: "is-danger",
        duration: 10000,
      });
    } else {
      toast.toast({
        message: `Saved ${selectedFile.name}`,
        type: "is-success",
      });
      filesMap[file.name] = file;
      selectedFile = file;
      selectedVersion = null;
      $sheetEditorState = assign({}, $sheetEditorState, {
        hasUnsavedChanges: false,
      });
    }
  }

  $effect(() => {
    if (selectedFile) {
      if (!editor || editor.state.doc.toString() != selectedFile.content) {
        if (editor) {
          editor.destroy();
        }

        editor = createEditor(selectedFile.content, editorDom, postings, {
          keybindings,
          autocomplete: {
            account: accounts,
            commodity: commodities,
            filename: ledgerFiles.map((f) => f.name),
          },
        });
        if (lineNumber > 0) {
          moveToLine(editor, lineNumber, true);
          focus(editor);
          lineNumber = 0;
        }
      }
    }
  });

  let modalOpen = $state(false);
  function openCreateModal() {
    modalOpen = true;
  }

  async function createFile(destinationFile: string) {
    destinationFile = destinationFile.trim() + ".paisa";
    const { saved, message } = await api.sheets.saveSheetFile({
      name: destinationFile,
      content: "",
    });

    if (saved) {
      toast.toast({
        message: `Created <b><a href="/more/sheets/${encodeURIComponent(
          destinationFile,
        )}">${destinationFile}</a></b>`,
        type: "is-success",
        duration: 5000,
      });

      const success = await navigate(
        `/more/sheets/${encodeURIComponent(destinationFile)}`,
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
</script>

<FileModal
  bind:open={modalOpen}
  on:save={(e) => createFile(e.detail)}
  label="Create"
  placeholder="scratch"
  help="Filename without any extension"
/>

<svelte:head>
  <title>{selectedFile?.name || data.name || "Sheet"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title={selectedFile?.name || data.name || "Sheet"}
    description="Edit and evaluate this .paisa calculation sheet"
  >
    {#snippet leading()}
      <a
        href="/more/sheets"
        class="inline-flex items-center gap-1 text-sm text-[var(--paisa-muted-foreground)] transition-colors hover:text-[var(--paisa-foreground)]"
      >
        <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
        <span>Sheets</span>
      </a>
    {/snippet}

    {#snippet actions()}
      <div class="flex items-center gap-2">
        {#if $sheetEditorState.hasUnsavedChanges}
          <Badge variant="warning" size="sm" rounded dot>Unsaved</Badge>
        {/if}
        <Badge variant="neutral" size="sm">
          {formatFloatUptoPrecision($sheetEditorState.evalDuration, 2)}ms
        </Badge>
        {#if $sheetEditorState.errors.length > 0}
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[rgba(239,68,68,0.2)] bg-[var(--paisa-danger-light)] px-2.5 py-0.5 text-xs font-semibold text-[var(--paisa-danger)] transition-colors hover:bg-[var(--paisa-danger)] hover:text-[var(--paisa-text-inverse)]"
            onclick={() => moveToLine(editor, $sheetEditorState.errors[0].line_from)}
            title="Click to jump to error"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-danger)]"></span>
            <span>{$sheetEditorState.errors.length} error(s)</span>
          </button>
        {/if}
      </div>
    {/snippet}
  </PageHeader>

  <Section>
    <!-- Full-Width IDE Container -->
    <div class="grid h-[calc(100vh-13.5rem)] min-h-[520px] w-full grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <!-- File Tree Sidebar -->
      <aside class="flex min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)] max-md:hidden">
        <div class="flex min-h-[38px] items-center gap-2 border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-muted)] px-3 py-2">
          <span class="text-[0.725rem] font-bold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
            <i class="fa-regular fa-folder-open mr-1"></i>
            SHEETS
          </span>
          <Badge variant="neutral" size="sm" rounded>{values(filesMap).length}</Badge>
          <button
            type="button"
            class="ml-auto inline-flex items-center justify-center rounded-[var(--paisa-radius-sm)] p-1 text-[0.75rem] text-[var(--paisa-text-muted)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-text-primary)]"
            title="Create new sheet"
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
            hasUnsavedChanges={$sheetEditorState.hasUnsavedChanges}
          />
        </div>
      </aside>

      <!-- Main Editor & Live Results Pane -->
      <main class="flex min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)]">
        <!-- Integrated Toolbar Header -->
        <div class="flex min-h-[38px] flex-wrap items-center justify-between gap-2 border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-bg)] px-3 py-1.5">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--paisa-text-primary)]">
              <i class="fa-regular fa-file-lines text-[var(--paisa-brand-primary)]"></i>
              <span class="max-w-[240px] truncate">{selectedFile?.name || "Sheet"}</span>
              {#if $sheetEditorState.hasUnsavedChanges}
                <span class="text-[0.75rem] leading-none text-[var(--paisa-warning)]" title="Unsaved changes">●</span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <Button
              variant={$sheetEditorState.hasUnsavedChanges ? "primary" : "secondary"}
              size="xs"
              disabled={$sheetEditorState.hasUnsavedChanges === false}
              onclick={() => save()}
              title="Save sheet (Ctrl+S)"
            >
              {#snippet icon()}
                <i class="fas fa-floppy-disk"></i>
              {/snippet}
              <span>Save</span>
            </Button>

            <Button
              variant="ghost"
              size="xs"
              disabled={$sheetEditorState.undoDepth === 0}
              onclick={undoEdit}
              title="Undo edit (Ctrl+Z)"
            >
              {#snippet icon()}
                <i class="fas fa-arrow-rotate-left"></i>
              {/snippet}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              disabled={$sheetEditorState.redoDepth === 0}
              onclick={redoEdit}
              title="Redo edit (Ctrl+Y)"
            >
              {#snippet icon()}
                <i class="fas fa-arrow-rotate-right"></i>
              {/snippet}
            </Button>

            <Button
              variant="ghost"
              size="xs"
              disabled={$sheetEditorState.hasUnsavedChanges}
              onclick={() => openCreateModal()}
              title="Create new sheet file"
            >
              {#snippet icon()}
                <i class="fas fa-plus"></i>
              {/snippet}
              <span>New</span>
            </Button>

            {#if !isEmpty(selectedFile?.versions)}
              <div class="ml-1 flex items-center gap-1 border-l border-[var(--paisa-border-default)] pl-2">
                <i class="fas fa-clock-rotate-left text-[0.75rem] text-[var(--paisa-text-muted)]" title="Backup versions"></i>
                <Select bind:value={selectedVersion} size="sm" class="max-w-[150px] font-mono text-xs">
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
                  title="Revert to backup version"
                >
                  Revert
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  ariaLabel="Clear all backup versions"
                  title="Delete backup history"
                  onclick={() => deleteBackups()}
                >
                  {#snippet icon()}
                    <i class="fas fa-trash-can"></i>
                  {/snippet}
                </Button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Split Editor & Results Workspace -->
        <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[var(--paisa-surface)]">
          <!-- CodeMirror Editor Pane -->
          <div
            class="relative flex-1 min-w-0 overflow-auto [&_.cm-editor]:h-full [&_.cm-editor]:min-h-full [&_.cm-editor]:border-0 [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:py-2 [&_.sheet-editor]:h-full"
          >
            <div class="sheet-editor h-full" bind:this={editorDom}></div>
          </div>

          <!-- Live Calculated Evaluation Results Pane -->
          <div
            class="sheet-result w-56 sm:w-64 md:w-72 border-l border-[var(--paisa-border-default)] bg-[var(--paisa-surface-2)] overflow-y-auto py-2 font-mono text-xs text-right select-text shadow-inner"
          >
            {#each $sheetEditorState.results as result, i}
              <div
                class="px-3 leading-[1.4] {i + 1 === $sheetEditorState.currentLine
                  ? 'bg-[var(--paisa-surface-hover)] font-bold text-[var(--paisa-text-primary)]'
                  : 'text-[var(--paisa-text-secondary)]'}"
              >
                <div
                  title={result.result}
                  class="paisa-truncate m-0 p-0 text-[0.875rem] leading-[1.4] {result.error
                    ? 'font-bold text-[var(--paisa-danger)]'
                    : ''} {result.align === 'left' ? 'text-left' : ''} {result.bold
                    ? 'font-bold text-[var(--paisa-text-primary)]'
                    : ''} {result.underline ? 'underline' : ''}"
                >
                  &nbsp;{result.result}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </main>
    </div>
  </Section>
</Page>
