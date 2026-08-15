<script lang="ts">
  import Select from "svelte-select";
  import {
    createEditor as createTemplateEditor,
    editorState as templateEditorState,
    updateContent as updateTemplateContent
  } from "$lib/editors/template_editor";
  import {
    createEditor as createPreviewEditor,
    updateContent as updatePreviewContent
  } from "$lib/editors/editor";
  import FileDropzone from "$lib/components/ui/FileDropzone.svelte";
  import { parse, asRows, render as renderJournal } from "$lib/importing/spreadsheet";
  import _ from "lodash";
  import type { EditorView } from "codemirror";
  import { onMount } from "svelte";
  import { ajax, type ImportTemplate } from "$lib/core/utils";
  import { accountTfIdf } from "../../../../store";
  import * as toast from "$lib/core/toast";
  import { ensureFileExtension } from "$lib/ledger/file";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let templates: ImportTemplate[] = $state([]);
  let selectedTemplate: ImportTemplate = $state();
  let saveAsName: string = $state();
  let preview = $state("");
  let parseErrorMessage: string = $state(null);
  let columnCount: number = $state(0);
  let data: any[][] = $state([]);
  let rows: Array<Record<string, any>> = $state([]);
  let options: { reverse: boolean; trim: boolean } = $state({ reverse: false, trim: true });
  let loading = $state(false);
  let activeFileName = $state("");

  let templateEditorDom: Element = $state();
  let templateEditor: EditorView = $state();

  let previewEditorDom: Element = $state();
  let previewEditor: EditorView = $state();

  function onSelectTemplate(tmpl: ImportTemplate) {
    if (!tmpl) return;
    selectedTemplate = tmpl;
    saveAsName = tmpl.name;
    if (templateEditor) {
      updateTemplateContent(templateEditor, tmpl.content);
    }
  }

  onMount(async () => {
    accountTfIdf.set(await ajax("/api/account/tf_idf"));
    ({ templates } = await ajax("/api/templates"));
    if (templates.length > 0) {
      selectedTemplate = templates[0];
      saveAsName = selectedTemplate.name;
      templateEditor = createTemplateEditor(selectedTemplate.content, templateEditorDom);
    }
    previewEditor = createPreviewEditor(preview, previewEditorDom, { readonly: true });
  });

  let saveAsNameDuplicate = $derived(!!_.find(templates, { name: saveAsName, template_type: "custom" }));

  async function save() {
    const { template, saved, message } = await ajax("/api/templates/upsert", {
      method: "POST",
      body: JSON.stringify({
        name: saveAsName,
        content: templateEditor.state.doc.toString()
      }),
      background: true
    });

    if (!saved) {
      toast.toast({
        message: `Failed to save ${saveAsName}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
      return;
    }

    ({ templates } = await ajax("/api/templates", { background: true }));
    const savedTmpl = _.find(templates, { id: template.id });
    if (savedTmpl) {
      onSelectTemplate(savedTmpl);
    }
    toast.toast({
      message: `Saved ${saveAsName}`,
      type: "is-success"
    });

    $templateEditorState = _.assign({}, $templateEditorState, { hasUnsavedChanges: false });
  }

  async function remove() {
    const oldName = selectedTemplate.name;
    const confirmed = confirm(`Are you sure you want to delete ${oldName} template?`);
    if (!confirmed) {
      return;
    }
    const { success, message } = await ajax("/api/templates/delete", {
      method: "POST",
      body: JSON.stringify({
        name: selectedTemplate.name
      }),
      background: true
    });

    if (!success) {
      toast.toast({
        message: `Failed to remove ${oldName}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
      return;
    }

    ({ templates } = await ajax("/api/templates", { background: true }));
    if (templates.length > 0) {
      onSelectTemplate(templates[0]);
    }
    toast.toast({
      message: `Removed ${oldName}`,
      type: "is-success"
    });

    $templateEditorState = _.assign({}, $templateEditorState, { hasUnsavedChanges: false });
  }

  $effect(() => {
    const currentTemplate = $templateEditorState.template;
    const currentRows = rows;
    const currentReverse = options.reverse;
    const currentTrim = options.trim;

    if (!_.isEmpty(currentRows) && currentTemplate && previewEditor) {
      try {
        const generated = renderJournal(currentRows, currentTemplate, {
          reverse: currentReverse,
          trim: currentTrim
        });
        preview = generated;
        updatePreviewContent(previewEditor, generated);
      } catch (e) {
        console.error(e);
      }
    } else if (_.isEmpty(currentRows) && previewEditor) {
      preview = "";
      updatePreviewContent(previewEditor, "");
    }
  });

  async function handleFilesSelect(e: { detail: { acceptedFiles: File[] } }) {
    const { acceptedFiles } = e.detail;
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    activeFileName = acceptedFiles[0].name;
    loading = true;
    try {
      const results = await parse(acceptedFiles[0]);
      if (results.error) {
        parseErrorMessage = results.error;
      } else {
        parseErrorMessage = null;
        data = results.data;
        rows = asRows(results);

        columnCount = _.maxBy(data, (row) => row.length)?.length || 0;
        _.each(data, (row) => {
          row.length = columnCount;
        });
      }
    } catch (err: any) {
      parseErrorMessage = err?.message || "Error parsing file";
    } finally {
      loading = false;
    }
  }

  function clearLoadedFile() {
    activeFileName = "";
    data = [];
    rows = [];
    columnCount = 0;
    preview = "";
    updatePreviewContent(previewEditor, "");
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(preview);
      toast.toast({
        message: "Copied to clipboard",
        type: "is-success"
      });
    } catch (e) {
      console.log(e);
      toast.toast({
        message: "Failed to copy to clipboard",
        type: "is-danger"
      });
    }
  }

  let modalOpen = $state(false);
  function openSaveModal() {
    modalOpen = true;
  }

  async function saveToFile(destinationFile: string) {
    destinationFile = ensureFileExtension(destinationFile, ".ledger");
    const { saved, message } = await ajax("/api/editor/save", {
      method: "POST",
      body: JSON.stringify({ name: destinationFile, content: preview, operation: "overwrite" }),
      background: true
    });

    if (saved) {
      toast.toast({
        message: `Saved <b><a href="/ledger/editor/${encodeURIComponent(
          destinationFile
        )}">${destinationFile}</a></b>`,
        type: "is-success",
        duration: 5000
      });
    } else {
      toast.toast({
        message: `Failed to save ${destinationFile}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
    }
  }

  function builtinNotAllowed(action: string, template: ImportTemplate) {
    if (template?.template_type == "builtin") {
      return `Not allowed to ${action.toLowerCase()} builtin template`;
    }
    return action;
  }

  let templateCreateModalOpen = $state(false);
  function openTemplateCreateModal() {
    templateCreateModalOpen = true;
  }
</script>

<Modal bind:active={templateCreateModalOpen}>
  {#snippet head({ close })}
    <p class="modal-card-title">Create Template</p>
    <button class="delete" aria-label="close" onclick={(e) => close(e)}></button>
  {/snippet}
  {#snippet body()}
    <div class="field">
      <label class="label" for="save-filename">Template Name</label>
      <div class="control" id="save-filename">
        <input class="input" type="text" bind:value={saveAsName} placeholder="e.g. HDFC Bank Statement" />
        {#if saveAsNameDuplicate}
          <p class="help is-danger">Template with the same name already exists</p>
        {/if}
      </div>
    </div>
  {/snippet}
  {#snippet foot({ close })}
    <button
      class="button is-success"
      disabled={_.isEmpty(saveAsName) || saveAsNameDuplicate}
      onclick={(e) => save() && close(e)}>Create</button
    >
    <button class="button" onclick={(e) => close(e)}>Cancel</button>
  {/snippet}
</Modal>

<FileModal bind:open={modalOpen} on:save={(e) => saveToFile(e.detail)} />

<Page width="fluid">
  <Section class="paisa-py-1">
    <div class="paisa-import-workspace">
      <!-- LEFT COLUMN: Transformation Engine (Template + Output Preview) -->
      <div class="paisa-import-left-pane">
        <!-- Top Toolbar -->
        <div class="paisa-import-topbar">
          <div class="paisa-import-select-wrapper">
            <Select
              bind:value={selectedTemplate}
              showChevron={true}
              items={templates}
              label="name"
              itemId="id"
              searchable={true}
              clearable={false}
              floatingConfig={{ strategy: "fixed" }}
              on:change={(e) => {
                onSelectTemplate(e.detail);
              }}
            >
              <div slot="selection" let:selection class="paisa-select-item-rendered">
                <span class="paisa-template-name">{selection.name}</span>
                <span class="tag is-small {selection.template_type === 'builtin' ? 'is-info is-light' : 'is-success is-light'}">
                  {selection.template_type}
                </span>
              </div>
              <div slot="item" let:item class="paisa-select-item-option">
                <span class="name">{item.name}</span>
                <span class="tag is-small {item.template_type === 'builtin' ? 'is-info is-light' : 'is-success is-light'}">
                  {item.template_type}
                </span>
              </div>
            </Select>
          </div>

          <div class="paisa-import-topbar-actions">
            <button
              class="button is-small"
              data-tippy-content="Create New Template"
              aria-label="Create Template"
              onclick={(_e) => openTemplateCreateModal()}
            >
              <span class="icon is-small">
                <i class="fas fa-plus"></i>
              </span>
            </button>

            <button
              class="button is-small"
              data-tippy-content={$templateEditorState.hasUnsavedChanges == false
                ? "No Unsaved Changes"
                : builtinNotAllowed("Save", selectedTemplate)}
              aria-label="Save Template"
              onclick={(_e) => save()}
              disabled={$templateEditorState.hasUnsavedChanges == false ||
                selectedTemplate?.template_type == "builtin"}
            >
              <span class="icon is-small">
                <i class="fas fa-floppy-disk"></i>
              </span>
            </button>

            <button
              class="button is-small is-danger is-light"
              data-tippy-content={builtinNotAllowed("Delete", selectedTemplate)}
              aria-label="Delete Template"
              onclick={(_e) => remove()}
              disabled={selectedTemplate?.template_type == "builtin"}
            >
              <span class="icon is-small">
                <i class="fas fa-trash-can"></i>
              </span>
            </button>
          </div>
        </div>

        <!-- Template Editor Card -->
        <div class="paisa-editor-card">
          <div class="paisa-editor-card-header">
            <div class="paisa-editor-card-title">
              <span class="icon is-small has-text-link mr-1"><i class="fas fa-code"></i></span>
              <span>Template Definition</span>
              <span class="tag is-small is-light ml-2">Handlebars</span>
            </div>
            {#if $templateEditorState.hasUnsavedChanges}
              <span class="tag is-warning is-light is-small">
                <span class="paisa-unsaved-dot"></span> Unsaved
              </span>
            {/if}
          </div>
          <div class="paisa-editor-card-body">
            <div class="template-editor" bind:this={templateEditorDom}></div>
          </div>
        </div>

        <!-- Ledger Preview Card -->
        <div class="paisa-editor-card">
          <div class="paisa-editor-card-header">
            <div class="paisa-editor-card-title">
              <span class="icon is-small has-text-success mr-1"><i class="fas fa-file-invoice-dollar"></i></span>
              <span>Ledger Preview</span>
              {#if !_.isEmpty(preview)}
                <span class="tag is-success is-light is-small ml-2">Generated</span>
              {/if}
            </div>
            <div class="paisa-editor-card-actions">
              <button
                data-tippy-content="Copy Generated Ledger"
                aria-label="Copy to Clipboard"
                class="button is-small clipboard"
                disabled={_.isEmpty(preview)}
                onclick={copyToClipboard}
              >
                <span class="icon is-small">
                  <i class="fas fa-copy"></i>
                </span>
                <span>Copy</span>
              </button>
              <button
                data-tippy-content="Save to Ledger File"
                aria-label="Save"
                class="button is-small is-link save"
                disabled={_.isEmpty(preview)}
                onclick={openSaveModal}
              >
                <span class="icon is-small">
                  <i class="fas fa-floppy-disk"></i>
                </span>
                <span>Save</span>
              </button>
            </div>
          </div>
          <div class="paisa-editor-card-body paisa-preview-body">
            <div class="preview-editor" bind:this={previewEditorDom}></div>
            {#if _.isEmpty(preview) && _.isEmpty(data)}
              <div class="paisa-preview-placeholder">
                <span class="icon has-text-grey-light mb-2"><i class="fas fa-arrow-right fa-2x"></i></span>
                <p>Upload a statement on the right to see generated journal transactions live.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: Source Data Inspector & Spreadsheet Viewer -->
      <div class="paisa-import-right-pane">
        <!-- Source Data Card -->
        <div class="paisa-data-card">
          <!-- Data Card Header & Controls -->
          <div class="paisa-data-card-header">
            <div class="paisa-data-file-info">
              {#if activeFileName}
                <div class="paisa-active-file-badge">
                  <span class="icon has-text-link mr-1"><i class="fas fa-file-csv"></i></span>
                  <span class="paisa-file-name" title={activeFileName}>{activeFileName}</span>
                  <span class="tag is-info is-light is-small ml-2">{data.length} rows</span>
                  <span class="tag is-light is-small ml-1">{columnCount} cols</span>
                  <button
                    class="button is-small is-ghost p-1 ml-1"
                    title="Remove file"
                    onclick={clearLoadedFile}
                  >
                    <span class="icon is-small has-text-danger"><i class="fas fa-xmark"></i></span>
                  </button>
                </div>
              {:else}
                <div class="paisa-data-header-title">
                  <span class="icon is-small has-text-link mr-1"><i class="fas fa-table-cells"></i></span>
                  <span>Spreadsheet Source</span>
                </div>
              {/if}
            </div>

            <!-- Toggles (Reverse / Trim) -->
            <div class="paisa-data-controls">
              <div class="field color-switch mb-0">
                <input
                  id="import-reverse"
                  type="checkbox"
                  bind:checked={options.reverse}
                  class="switch is-rounded is-small"
                />
                <label for="import-reverse" class="is-size-7">Reverse</label>
              </div>
              <div class="field color-switch mb-0">
                <input
                  id="trim-reverse"
                  type="checkbox"
                  bind:checked={options.trim}
                  class="switch is-rounded is-small"
                />
                <label for="trim-reverse" class="is-size-7">Trim</label>
              </div>
            </div>
          </div>

          <!-- Error Message if parse fails -->
          {#if parseErrorMessage}
            <div class="notification is-danger is-light p-3 m-3">
              <div class="is-flex is-align-items-center">
                <span class="icon mr-2"><i class="fas fa-triangle-exclamation"></i></span>
                <div class="is-size-7"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
              </div>
            </div>
          {/if}

          <!-- Dropzone Area -->
          <div class="paisa-dropzone-container" class:has-file={!_.isEmpty(data)}>
            <FileDropzone
              multiple={false}
              accept=".csv,.txt,.xls,.xlsx,.pdf,.CSV,.TXT,.XLS,.XLSX,.PDF"
              on:drop={handleFilesSelect}
            >
              {#if _.isEmpty(data)}
                <div class="paisa-dropzone-content-empty">
                  <div class="paisa-dropzone-icon-circle">
                    <i class="fas fa-cloud-arrow-up fa-2x"></i>
                  </div>
                  <h4 class="title is-6 mb-1">Drag & drop your bank / broker statement</h4>
                  <p class="subtitle is-7 has-text-grey mb-3">Supports CSV, TXT, XLS, XLSX, and PDF</p>
                  <div class="tags are-small is-centered mb-0">
                    <span class="tag is-rounded is-light">CSV</span>
                    <span class="tag is-rounded is-light">XLS / XLSX</span>
                    <span class="tag is-rounded is-light">PDF</span>
                  </div>
                </div>
              {:else}
                <div class="paisa-dropzone-compact">
                  <span class="icon is-small mr-2"><i class="fas fa-arrows-rotate"></i></span>
                  <span class="is-size-7">Drop a different file to replace current data</span>
                </div>
              {/if}
            </FileDropzone>
          </div>

          <!-- Loading Indicator -->
          {#if loading}
            <div class="paisa-data-loading-state">
              <span class="icon is-large has-text-link">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
              </span>
              <p class="is-size-6 mt-2 has-text-weight-semibold">Parsing Spreadsheet Data…</p>
              <p class="is-size-7 has-text-grey">Extracting tabular rows and columns</p>
            </div>
          {/if}

          <!-- Spreadsheet Grid Table -->
          {#if !_.isEmpty(data) && !loading}
            <div class="paisa-spreadsheet-grid-wrapper">
              <table class="table is-bordered is-size-7 is-narrow paisa-sheet-table">
                <thead>
                  <tr>
                    <th class="paisa-sheet-corner-cell">#</th>
                    {#each _.range(0, columnCount) as ci}
                      <th class="paisa-sheet-col-header">
                        <span class="paisa-col-letter">{String.fromCharCode(65 + ci)}</span>
                        <span class="paisa-col-tag">ROW.{String.fromCharCode(65 + ci)}</span>
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each data as row, ri}
                    <tr>
                      <th class="paisa-sheet-row-header">{ri}</th>
                      {#each row as cell}
                        <td class="paisa-sheet-data-cell" title={cell || ""}>{cell || ""}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else if _.isEmpty(data) && !loading}
            <!-- Empty state guide -->
            <div class="paisa-sheet-guide">
              <div class="paisa-guide-card">
                <h5 class="is-size-7 has-text-weight-bold has-text-link mb-2">
                  <i class="fas fa-lightbulb mr-1"></i> Quick Template Guide
                </h5>
                <div class="columns is-mobile is-multiline is-variable is-2 is-size-7">
                  <div class="column is-6">
                    <code>{"{{ ROW.A }}"}</code>
                    <p class="has-text-grey is-size-7">References Column A data</p>
                  </div>
                  <div class="column is-6">
                    <code>{"{{ date ROW.A \"DD-MMM-YYYY\" }}"}</code>
                    <p class="has-text-grey is-size-7">Formats dates into ledger format</p>
                  </div>
                  <div class="column is-6">
                    <code>{"{{ predictAccount prefix=\"Expenses\" }}"}</code>
                    <p class="has-text-grey is-size-7">Auto-classifies accounts with TF-IDF</p>
                  </div>
                  <div class="column is-6">
                    <code>{"{{ findAbove B regexp=\"...\" }}"}</code>
                    <p class="has-text-grey is-size-7">Scans preceding rows for headers</p>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Section>
</Page>

<style lang="scss">
  /* Two-Panel Workspace Grid */
  .paisa-import-workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-3);
    align-items: start;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(400px, 4.5fr) minmax(500px, 5.5fr);
    }
  }

  /* Left Panel */
  .paisa-import-left-pane {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-3);
    min-width: 0;
  }

  /* Top Toolbar */
  .paisa-import-topbar {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-2);
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    box-shadow: var(--paisa-shadow-sm);
  }

  .paisa-import-select-wrapper {
    flex: 1;
    min-width: 0;

    :global(.svelte-select) {
      border: 1px solid var(--paisa-border-default);
      background-color: var(--paisa-canvas-bg);
      border-radius: var(--paisa-radius-sm);
    }
  }

  .paisa-select-item-rendered {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    width: 100%;
    overflow: hidden;

    .paisa-template-name {
      font-weight: var(--paisa-font-weight-semibold);
      color: var(--paisa-text-primary);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  }

  .paisa-select-item-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .paisa-import-topbar-actions {
    display: flex;
    gap: var(--paisa-space-1);
    flex-shrink: 0;
  }

  /* Editor Cards */
  .paisa-editor-card {
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    box-shadow: var(--paisa-shadow-sm);
    overflow: hidden;
  }

  .paisa-editor-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-subtle);
  }

  .paisa-editor-card-title {
    display: flex;
    align-items: center;
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .paisa-editor-card-actions {
    display: flex;
    gap: var(--paisa-space-2);
  }

  .paisa-editor-card-body {
    position: relative;
    padding: 0;
    min-height: 220px;

    :global(.cm-editor) {
      height: clamp(200px, 32vh, 380px);
      font-size: 0.85rem;
    }
  }

  .paisa-preview-body {
    background-color: var(--paisa-canvas-bg);
  }

  .paisa-preview-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--paisa-space-4);
    color: var(--paisa-text-muted);
    font-size: var(--paisa-font-size-xs);
    pointer-events: none;
  }

  .paisa-unsaved-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--paisa-warning);
    margin-right: 4px;
  }

  /* Right Panel: Source Data Card */
  .paisa-import-right-pane {
    min-width: 0;
  }

  .paisa-data-card {
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    box-shadow: var(--paisa-shadow-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .paisa-data-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-subtle);
    gap: var(--paisa-space-3);
  }

  .paisa-data-file-info {
    min-width: 0;
    flex: 1;
  }

  .paisa-active-file-badge {
    display: flex;
    align-items: center;
    min-width: 0;

    .paisa-file-name {
      font-weight: var(--paisa-font-weight-semibold);
      font-size: var(--paisa-font-size-sm);
      color: var(--paisa-text-primary);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
      max-width: 200px;
    }
  }

  .paisa-data-header-title {
    display: flex;
    align-items: center;
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .paisa-data-controls {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    flex-shrink: 0;
  }

  /* Dropzone Styling */
  .paisa-dropzone-container {
    padding: var(--paisa-space-3);

    &.has-file {
      padding: var(--paisa-space-2);
      border-bottom: 1px solid var(--paisa-border-subtle);
    }

    :global(.paisa-file-dropzone) {
      width: 100%;
      border: 2px dashed var(--paisa-border-default);
      background-color: var(--paisa-canvas-bg);
      border-radius: var(--paisa-radius-md);
      transition: all var(--paisa-transition-fast);
      cursor: pointer;

      &:hover {
        border-color: var(--paisa-brand-primary);
        background-color: var(--paisa-brand-primary-light);
      }
    }
  }

  .paisa-dropzone-content-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-5) var(--paisa-space-4);
    text-align: center;

    .paisa-dropzone-icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--paisa-brand-primary-light);
      color: var(--paisa-brand-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--paisa-space-3);
    }
  }

  .paisa-dropzone-compact {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-2);
    color: var(--paisa-text-muted);
  }

  .paisa-data-loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-6) var(--paisa-space-4);
    color: var(--paisa-text-primary);
  }

  /* Spreadsheet Grid Table */
  .paisa-spreadsheet-grid-wrapper {
    overflow: auto;
    max-height: calc(100vh - 210px);
    border-top: 1px solid var(--paisa-border-subtle);
    background-color: var(--paisa-table-bg);
  }

  .paisa-sheet-table {
    border-collapse: separate;
    border-spacing: 0;
    margin: 0;
    width: 100%;
    min-width: 100%;

    thead th {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: var(--paisa-table-header-bg);
      color: var(--paisa-table-header-text);
      border-color: var(--paisa-table-border);
      text-align: center;
      padding: var(--paisa-space-1) var(--paisa-space-2);
      font-size: var(--paisa-font-size-xs);
    }

    .paisa-sheet-corner-cell {
      position: sticky;
      left: 0;
      top: 0;
      z-index: 15;
      background-color: var(--paisa-table-header-bg);
      border-color: var(--paisa-table-border);
      width: 40px;
      min-width: 40px;
    }

    .paisa-sheet-col-header {
      min-width: 110px;

      .paisa-col-letter {
        font-weight: var(--paisa-font-weight-bold);
        font-size: var(--paisa-font-size-sm);
        display: block;
      }

      .paisa-col-tag {
        font-size: 0.68rem;
        color: var(--paisa-brand-primary);
        font-family: monospace;
        display: block;
      }
    }

    .paisa-sheet-row-header {
      position: sticky;
      left: 0;
      z-index: 5;
      background-color: var(--paisa-table-header-bg);
      color: var(--paisa-table-header-text);
      border-color: var(--paisa-table-border);
      text-align: center;
      width: 40px;
      min-width: 40px;
      font-weight: var(--paisa-font-weight-semibold);
    }

    .paisa-sheet-data-cell {
      border-color: var(--paisa-table-border);
      background-color: var(--paisa-table-bg);
      color: var(--paisa-text-primary);
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: var(--paisa-space-1) var(--paisa-space-2);

      &:hover {
        background-color: var(--paisa-table-row-hover);
      }
    }

    tbody tr:hover {
      .paisa-sheet-row-header {
        background-color: var(--paisa-surface-hover);
        color: var(--paisa-brand-primary);
      }
      .paisa-sheet-data-cell {
        background-color: var(--paisa-table-row-hover);
      }
    }
  }

  /* Quick Guide Card */
  .paisa-sheet-guide {
    padding: var(--paisa-space-3);

    .paisa-guide-card {
      background-color: var(--paisa-canvas-bg);
      border: 1px dashed var(--paisa-border-default);
      border-radius: var(--paisa-radius-sm);
      padding: var(--paisa-space-3);

      code {
        background-color: var(--paisa-surface-hover);
        color: var(--paisa-brand-primary);
        padding: 2px 5px;
        border-radius: var(--paisa-radius-xs);
        font-size: 0.75rem;
      }
    }
  }

  .color-switch {
    :global(.switch[type="checkbox"]:checked + label::before),
    :global(.switch[type="checkbox"]:checked + label:before) {
      background: var(--paisa-brand-primary);
    }
  }
</style>
