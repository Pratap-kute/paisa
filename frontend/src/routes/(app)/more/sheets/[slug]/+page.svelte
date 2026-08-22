<script lang="ts">
  import { createEditor, sheetEditorState } from "$lib/editors/sheet_editor";
  import { focus, moveToLine, updateContent } from "$lib/editors/editor";
  import {
    ajax,
    buildDirectoryTree,
    formatFloatUptoPrecision,
    type LedgerFile,
    type Posting,
    type SheetFile,
  } from "$lib/core/utils";
  import { redo, undo } from "@codemirror/commands";
  import type { KeyBinding, EditorView } from "@codemirror/view";
  import * as toast from "$lib/core/toast";
  import _ from "lodash";
  import { onMount } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import FileTree from "$lib/components/ledger/FileTree.svelte";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import { page } from "$app/stores";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Select from "$lib/components/ui/Select.svelte";

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
        $sheetEditorState = _.assign({}, $sheetEditorState, {
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
    const line = _.toNumber($page.url.hash.substring(1));
    if (_.isNumber(line)) {
      lineNumber = line;
    }
  });

  async function loadFiles(selectedFileName: string) {
    let files;
    ({
      files: ledgerFiles,
      accounts,
      commodities,
    } = await ajax("/api/editor/files"));
    ({ files, postings } = await ajax("/api/sheets/files"));
    filesMap = _.fromPairs(_.map(files, (f) => [f.name, f]));
    if (!_.isEmpty(files)) {
      selectedFile =
        _.find(files, (f) => f.name == selectedFileName) || files[0];
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
    const { file } = await ajax("/api/sheets/file", {
      method: "POST",
      body: JSON.stringify({ name: version }),
      background: true,
    });

    updateContent(editor, file.content);
  }

  async function deleteBackups() {
    const { file } = await ajax("/api/sheets/file/delete_backups", {
      method: "POST",
      body: JSON.stringify({ name: selectedFile.name }),
      background: true,
    });

    selectedFile.versions = file.versions;
  }

  async function save() {
    const doc = editor.state.doc;
    const { saved, file, message } = await ajax("/api/sheets/save", {
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
    } else {
      toast.toast({
        message: `Saved ${selectedFile.name}`,
        type: "is-success",
      });
      filesMap[file.name] = file;
      selectedFile = file;
      selectedVersion = null;
      $sheetEditorState = _.assign({}, $sheetEditorState, {
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
    const { saved, message } = await ajax("/api/sheets/save", {
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
      {#if $sheetEditorState.hasUnsavedChanges}
        <Badge variant="warning" size="sm" rounded dot>Unsaved</Badge>
      {/if}
      <Badge variant="neutral" size="sm">
        {formatFloatUptoPrecision($sheetEditorState.evalDuration, 2)}ms
      </Badge>
      {#if $sheetEditorState.errors.length > 0}
        <Badge variant="danger" size="sm">
          {$sheetEditorState.errors.length} error(s)
        </Badge>
      {/if}
    {/snippet}
  </PageHeader>

  <Section>
    <Card
      padding="sm"
      variant="flat"
      class="mb-4 flex w-full flex-wrap items-center gap-3 overflow-x-auto"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={$sheetEditorState.hasUnsavedChanges}
          onclick={() => openCreateModal()}
        >
          {#snippet icon()}
            <i class="fas fa-file-circle-plus"></i>
          {/snippet}
          <span>Create</span>
        </Button>

        <Button
          variant={$sheetEditorState.hasUnsavedChanges ? "primary" : "secondary"}
          size="sm"
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
          size="sm"
          disabled={$sheetEditorState.undoDepth === 0}
          onclick={undoEdit}
          title="Undo edit"
        >
          {#snippet icon()}
            <i class="fas fa-arrow-left"></i>
          {/snippet}
          <span>Undo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={$sheetEditorState.redoDepth === 0}
          onclick={redoEdit}
          title="Redo edit"
        >
          <span>Redo</span>
          {#snippet icon()}
            <i class="fas fa-arrow-right"></i>
          {/snippet}
        </Button>
      </div>

      {#if !_.isEmpty(selectedFile?.versions)}
        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedVersion}
            onclick={() => revert(selectedVersion)}
          >
            {#snippet icon()}
              <i class="fas fa-clock-rotate-left"></i>
            {/snippet}
            <span>Revert</span>
          </Button>

          <Select bind:value={selectedVersion} size="sm">
            {#each selectedFile.versions as version}
              <option value={version}>{version}</option>
            {/each}
          </Select>

          <Button
            variant="ghost"
            size="sm"
            ariaLabel="Delete backups"
            onclick={() => deleteBackups()}
          >
            {#snippet icon()}
              <i class="fas fa-trash-can"></i>
            {/snippet}
          </Button>
        </div>
      {/if}

      {#if $sheetEditorState.errors.length > 0}
        <Button
          variant="ghost"
          size="sm"
          onclick={() =>
            moveToLine(editor, $sheetEditorState.errors[0].line_from)}
        >
          <Badge variant="danger" size="sm">
            {$sheetEditorState.errors.length} error(s) found
          </Badge>
        </Button>
      {/if}
    </Card>

    <div
      class="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(180px,1fr)_minmax(0,4fr)]"
    >
      <aside class="min-w-0">
        <Card padding="sm" variant="flat" class="h-full max-h-[calc(100vh-220px)] overflow-y-auto px-2">
          <FileTree
            path=""
            on:select={(e) => selectFile(e.detail)}
            files={buildDirectoryTree(_.values(filesMap))}
            selectedFileName={selectedFile?.name}
            hasUnsavedChanges={$sheetEditorState.hasUnsavedChanges}
          />
        </Card>
      </aside>

      <div class="min-w-0 overflow-x-auto">
        <div class="flex min-w-0">
          <Card
            padding="none"
            variant="flat"
            class="mb-0 min-w-[min(75%,24rem)] max-w-[min(75%,48rem)] rounded-r-none border-r-0 py-0 pr-1"
          >
            <div class="sheet-editor" bind:this={editorDom}></div>
          </Card>
          <Card
            padding="none"
            variant="flat"
            class="sheet-result mb-0 w-[min(25%,200px)] rounded-l-none py-1 text-right"
          >
            {#each $sheetEditorState.results as result, i}
              <div
                class={i + 1 === $sheetEditorState.currentLine
                  ? "bg-[var(--paisa-surface-hover)] font-semibold text-[var(--paisa-foreground)]"
                  : ""}
                style="padding: 0 0.5rem"
              >
                <div
                  title={result.result}
                  class="paisa-truncate m-0 p-0 text-[0.9285714285714286rem] leading-[1.4] {result.error
                    ? 'text-[var(--paisa-danger)]'
                    : ''} {result.align === 'left' ? 'text-left' : ''} {result.bold
                    ? 'font-bold'
                    : ''} {result.underline ? 'underline' : ''}"
                >
                  &nbsp;{result.result}
                </div>
              </div>
            {/each}
          </Card>
        </div>
      </div>
    </div>
  </Section>
</Page>
