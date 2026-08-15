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
  import type { KeyBinding } from "@codemirror/view";
  import * as toast from "$lib/core/toast";
  import type { EditorView } from "codemirror";
  import { format } from "$lib/ledger/journal";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import { beforeNavigate, goto } from "$app/navigation";
  import type { PageData } from "./$types";
  import FileTree from "$lib/components/ledger/FileTree.svelte";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import { page } from "$app/stores";

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
</script>

<FileModal bind:open={modalOpen} on:save={(e) => createFile(e.detail)} label="Create" help="" />

<section class="section tab-editor paisa-max-screen-height" style="padding-bottom: 0 !important">
  <div class="container is-fluid">
    <div class="columuns">
      <div class="column is-12 px-0 pt-0 mb-2">
        <div class="box p-3 is-flex is-align-items-center paisa-overflow-x-auto" style="width: 100%">
          <div class="field has-addons mb-0">
            <p class="control">
              <button
                class="button is-small is-link invertable is-light"
                disabled={$editorState.hasUnsavedChanges}
                onclick={(_e) => openCreateModal()}
              >
                <span class="icon is-small">
                  <i class="fas fa-file-circle-plus"></i>
                </span>
                <span>Create</span>
              </button>
            </p>
          </div>

          <div class="field has-addons ml-5 mb-0">
            <p class="control">
              <button
                class="button is-small"
                disabled={$editorState.hasUnsavedChanges == false}
                onclick={(_e) => save()}
              >
                <span class="icon is-small">
                  <i class="fas fa-floppy-disk"></i>
                </span>
                <span>Save</span>
              </button>
            </p>
            <p class="control">
              <button
                class="button is-small"
                disabled={$editorState.undoDepth == 0}
                onclick={undoEdit}
              >
                <span class="icon is-small">
                  <i class="fas fa-arrow-left"></i>
                </span>
                <span>Undo</span>
              </button>
            </p>
            <p class="control">
              <button
                class="button is-small"
                disabled={$editorState.redoDepth == 0}
                onclick={redoEdit}
              >
                <span>Redo</span>
                <span class="icon is-small">
                  <i class="fas fa-arrow-right"></i>
                </span>
              </button>
            </p>
            <p class="control">
              <button class="button is-small" onclick={(_e) => pretty()}>
                <span class="icon is-small">
                  <i class="fas fa-code"></i>
                </span>
                <span>Prettify</span>
              </button>
            </p>
          </div>

          {#if !_.isEmpty(selectedFile?.versions)}
            <div class="field has-addons ml-5 mb-0">
              <p class="control">
                <button
                  class="button is-small"
                  disabled={!selectedVersion}
                  onclick={(_e) => revert(selectedVersion)}
                >
                  <span class="icon is-small">
                    <i class="fas fa-clock-rotate-left"></i>
                  </span>
                  <span>Revert</span>
                </button>
              </p>

              <div class="control">
                <div class="select is-small">
                  <select bind:value={selectedVersion}>
                    {#each selectedFile.versions as version}
                      <option>{version}</option>
                    {/each}
                  </select>
                </div>
              </div>

              <p class="control">
                <button class="button is-small" aria-label="Delete backups" onclick={(_e) => deleteBackups()}>
                  <span class="icon is-small">
                    <i class="fas fa-trash-can"></i>
                  </span>
                </button>
              </p>
            </div>
          {/if}

          {#if $editorState.errors.length > 0}
            <div class="control ml-5">
              <button type="button" class="button is-ghost p-0" onclick={(_e) => moveToLine(editor, $editorState.errors[0].line_from)}
                ><span class="ml-1 tag invertable is-danger is-light"
                  >{$editorState.errors.length} error(s) found</span
                ></button
              >
            </div>
          {/if}
        </div>
      </div>
    </div>
    <div class="columns">
      <div class="column is-3-widescreen is-2-fullhd is-4">
        <div class="box px-2 full-height paisa-overflow-y-auto">
          <aside class="menu">
            <FileTree
              path=""
              on:select={(e) => selectFile(e.detail)}
              files={buildDirectoryTree(_.values(filesMap))}
              selectedFileName={selectedFile?.name}
              hasUnsavedChanges={$editorState.hasUnsavedChanges}
            />
          </aside>
        </div>
      </div>
      <div class="column is-6-widescreen is-6-fullhd is-8">
        <div class="box py-0">
          <div class="editor" bind:this={editorDom}></div>
        </div>
      </div>
      <div class="column is-3-widescreen is-4-fullhd is-hidden-touch is-hidden-desktop-only">
        {#if !_.isEmpty($editorState.output)}
          <pre class="box px-3 full-height">{$editorState.output}</pre>
        {/if}
      </div>
    </div>
  </div>
</section>
