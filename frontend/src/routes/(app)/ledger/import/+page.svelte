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
  import {
    parse,
    asRows,
    renderWithMetadata,
    type RenderMetadata
  } from "$lib/importing/spreadsheet";
  import {
    commitParseOutcome,
    displayCell,
    emptyRenderMetadata,
  } from "$lib/importing/import_commit";
  import _ from "lodash";
  import { EditorView } from "@codemirror/view";
  import { onMount } from "svelte";
  import { ajax, type ImportTemplate } from "$lib/core/utils";
  import { accountTfIdf } from "../../../../store";
  import * as toast from "$lib/core/toast";
  import { ensureFileExtension } from "$lib/ledger/file";
  import FileModal from "$lib/components/ledger/FileModal.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import PredictionReviewBar from "$lib/components/prediction/PredictionReviewBar.svelte";
  import PredictionRowBadge from "$lib/components/prediction/PredictionRowBadge.svelte";
  import PredictionDetail from "$lib/components/prediction/PredictionDetail.svelte";
  import {
    predictionSession,
    rowMatchesFilter,
    type ConfidenceFilter,
  } from "$lib/prediction/session";
  import type { Confidence, PredictionResult } from "$lib/prediction/types";

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
  let templateDrawerOpen = $state(false);
  let selectedSourceRowIndex: number | null = $state(null);
  let predictionTick = $state(0);
  let predictionFilter: ConfidenceFilter = $state(null);
  let predictionCounts = $state({
    high: 0,
    medium: 0,
    review: 0,
    unknown: 0,
    transfer: 0,
  });
  let predictionReviewFailed = $state(false);
  let predictionRows = $state<
    Array<{
      rowIndex: number;
      confidence: Confidence;
      possibleTransfer: boolean;
      results: PredictionResult[];
    }>
  >([]);

  function refreshPredictionReview() {
    try {
      predictionSession.finalizeCurrentImport();
      predictionCounts = predictionSession.counts();
      predictionRows = predictionSession.rowSummaries();
      predictionReviewFailed = false;
    } catch (error) {
      console.error(error);
      predictionReviewFailed = true;
    }
  }
  let renderMetadata: RenderMetadata = $state({
    content: "",
    rows: [],
    generatedCount: 0,
    errors: []
  });

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
    const [tfidf, historyResponse] = await Promise.all([
      ajax("/api/account/tf_idf"),
      ajax("/api/prediction/history"),
    ]);
    accountTfIdf.set(tfidf);
    predictionSession.loadHistory(historyResponse.history || []);
    ({ templates } = await ajax("/api/templates"));
    if (templates.length > 0) {
      selectedTemplate = templates[0];
      saveAsName = selectedTemplate.name;
      templateEditor = createTemplateEditor(selectedTemplate.content, templateEditorDom);
    }
    previewEditor = createPreviewEditor(preview, previewEditorDom, { readonly: true });
  });

  let saveAsNameDuplicate = $derived(!!_.find(templates, { name: saveAsName, template_type: "custom" }));
  let selectedTemplateIsBuiltin = $derived(selectedTemplate?.template_type == "builtin");
  let templateSaveDisabled = $derived(!$templateEditorState.hasUnsavedChanges || !selectedTemplate);
  let templateSaveTooltip = $derived(
    !$templateEditorState.hasUnsavedChanges
      ? "No Unsaved Changes"
      : selectedTemplateIsBuiltin
      ? "Save edited builtin template as custom"
      : "Save Template"
  );

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
    const _tick = predictionTick;

    if (!_.isEmpty(currentRows) && currentTemplate && previewEditor) {
      try {
        predictionSession.beginRender();
      } catch (error) {
        console.error(error);
      }
      try {
        const generated = renderWithMetadata(currentRows, currentTemplate, {
          reverse: currentReverse,
          trim: currentTrim
        });
        renderMetadata = generated;
        preview = generated.content;
        updatePreviewContent(previewEditor, generated.content);
      } catch (e) {
        console.error(e);
        renderMetadata = emptyRenderMetadata;
        preview = "";
        updatePreviewContent(previewEditor, "");
      }
      refreshPredictionReview();
    } else if (_.isEmpty(currentRows) && previewEditor) {
      renderMetadata = { content: "", rows: [], generatedCount: 0, errors: [] };
      preview = "";
      updatePreviewContent(previewEditor, "");
      predictionCounts = { high: 0, medium: 0, review: 0, unknown: 0, transfer: 0 };
      predictionRows = [];
      predictionReviewFailed = false;
    }
  });

  async function handleFilesSelect(e: { detail: { acceptedFiles: File[] } }) {
    const { acceptedFiles } = e.detail;
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    loading = true;
    const fileName = acceptedFiles[0].name;
    try {
      const results = await parse(acceptedFiles[0]);
      const outcome = commitParseOutcome(fileName, results);
      if (outcome.ok === false) {
        clearLoadedFile();
        activeFileName = outcome.fileName;
        parseErrorMessage = outcome.error;
      } else {
        parseErrorMessage = null;
        activeFileName = outcome.fileName;
        data = outcome.data;
        rows = asRows(results);
        selectedSourceRowIndex = null;
        predictionSession.clearPreview();
        predictionFilter = null;
        predictionTick += 1;

        columnCount = _.maxBy(data, (row) => row.length)?.length || 0;
        _.each(data, (row) => {
          row.length = columnCount;
        });
      }
    } catch (err: any) {
      const outcome = commitParseOutcome(
        fileName,
        null,
        err?.message || "Error parsing file",
      );
      clearLoadedFile();
      activeFileName = outcome.fileName;
      parseErrorMessage = outcome.ok === false ? outcome.error : null;
    } finally {
      loading = false;
    }
  }

  function clearLoadedFile() {
    activeFileName = "";
    data = [];
    rows = [];
    columnCount = 0;
    selectedSourceRowIndex = null;
    predictionSession.clearPreview();
    predictionFilter = null;
    predictionCounts = { high: 0, medium: 0, review: 0, unknown: 0, transfer: 0 };
    predictionRows = [];
    predictionReviewFailed = false;
    renderMetadata = { content: "", rows: [], generatedCount: 0, errors: [] };
    preview = "";
    updatePreviewContent(previewEditor, "");
  }

  function selectSourceRow(rowIndex: number) {
    selectedSourceRowIndex = rowIndex;
    const renderedRow = _.find(renderMetadata.rows, { sourceRowIndex: rowIndex });
    if (!renderedRow?.lineRange || !previewEditor) {
      return;
    }

    const line = previewEditor.state.doc.line(renderedRow.lineRange.from);
    previewEditor.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: "center" })
    });
  }

  function summaryForRow(rowIndex: number) {
    try {
      return _.find(predictionRows, { rowIndex });
    } catch (_error) {
      return undefined;
    }
  }

  function rowIsVisible(rowIndex: number) {
    return rowMatchesFilter(summaryForRow(rowIndex), predictionFilter);
  }

  let selectedPrediction = $derived(
    selectedSourceRowIndex == null
      ? null
      : (summaryForRow(selectedSourceRowIndex)?.results[0] || null)
  );

  function overrideSelected(account: string) {
    if (selectedSourceRowIndex == null || !selectedPrediction) return;
    predictionSession.setOverride(
      selectedSourceRowIndex,
      selectedPrediction.prefix,
      account,
      selectedPrediction.helperInvocationIndex,
    );
    predictionTick += 1;
  }

  function applySimilar(account: string) {
    if (selectedSourceRowIndex == null || !selectedPrediction) return;
    predictionSession.applyToSimilar(
      selectedSourceRowIndex,
      selectedPrediction.prefix,
      account,
      selectedPrediction.helperInvocationIndex,
    );
    predictionTick += 1;
  }

  function alwaysUseMerchant(account: string) {
    if (!selectedPrediction) return;
    predictionSession.alwaysUseMerchant(
      selectedPrediction.merchantKey,
      selectedPrediction.prefix,
      account,
    );
    if (selectedSourceRowIndex != null) {
      predictionSession.setOverride(
        selectedSourceRowIndex,
        selectedPrediction.prefix,
        account,
        selectedPrediction.helperInvocationIndex,
      );
    }
    predictionTick += 1;
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
      try {
        const historyResponse = await ajax("/api/prediction/history");
        predictionSession.loadHistory(historyResponse.history || []);
        predictionTick += 1;
      } catch (error) {
        console.error(error);
      }
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
      <div class="paisa-import-topbar">
        <div class="paisa-import-template-block">
          <div class="paisa-import-select-wrapper">
            <Select
              bind:value={selectedTemplate}
              --list-z-index="100"
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
            <button class="button is-small is-link is-light" onclick={() => (templateDrawerOpen = true)}>
              <span class="icon is-small"><i class="fas fa-code"></i></span>
              <span>Edit Template</span>
              {#if $templateEditorState.hasUnsavedChanges}
                <span class="tag is-warning is-light is-small ml-1">Unsaved</span>
              {/if}
            </button>
            <button
              class="button is-small"
              data-tippy-content="Create New Template"
              aria-label="Create Template"
              onclick={(_e) => openTemplateCreateModal()}
            >
              <span class="icon is-small"><i class="fas fa-plus"></i></span>
            </button>
            <button
              class="button is-small"
              data-tippy-content={templateSaveTooltip}
              aria-label="Save Template"
              onclick={(_e) => save()}
              disabled={templateSaveDisabled}
            >
              <span class="icon is-small"><i class="fas fa-floppy-disk"></i></span>
            </button>
            <button
              class="button is-small is-danger is-light"
              data-tippy-content={builtinNotAllowed("Delete", selectedTemplate)}
              aria-label="Delete Template"
              onclick={(_e) => remove()}
              disabled={selectedTemplate?.template_type == "builtin"}
            >
              <span class="icon is-small"><i class="fas fa-trash-can"></i></span>
            </button>
          </div>
        </div>

        <div class="paisa-import-file-block">
          {#if activeFileName}
            <span class="icon has-text-link"><i class="fas fa-file-csv"></i></span>
            <span class="paisa-file-name" title={activeFileName}>{activeFileName}</span>
            <span class="tag is-info is-light is-small">{data.length} rows</span>
            <span class="tag is-light is-small">{columnCount} cols</span>
            <button class="button is-small is-light" onclick={clearLoadedFile}>
              <span class="icon is-small"><i class="fas fa-arrows-rotate"></i></span>
              <span>Replace File</span>
            </button>
          {:else}
            <span class="icon has-text-grey"><i class="fas fa-file-import"></i></span>
            <span class="has-text-grey is-size-7">No file loaded</span>
          {/if}
        </div>

        <div class="paisa-data-controls">
          <div class="field color-switch mb-0">
            <input id="import-reverse" type="checkbox" bind:checked={options.reverse} class="switch is-rounded is-small" />
            <label for="import-reverse" class="is-size-7">Reverse</label>
          </div>
          <div class="field color-switch mb-0">
            <input id="trim-reverse" type="checkbox" bind:checked={options.trim} class="switch is-rounded is-small" />
            <label for="trim-reverse" class="is-size-7">Trim</label>
          </div>
        </div>
      </div>

      <div class="paisa-import-main-grid">
        <div class="paisa-import-pane paisa-source-pane">
          <div class="paisa-pane-header">
            <div class="paisa-pane-title">
              <span class="icon is-small has-text-link"><i class="fas fa-table-cells"></i></span>
              <span>Source Data</span>
            </div>
            {#if !predictionReviewFailed && !_.isEmpty(data) && (predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown) > 0}
              <PredictionReviewBar
                counts={predictionCounts}
                filter={predictionFilter}
                onFilter={(next) => (predictionFilter = next)}
              />
            {/if}
          </div>

          {#if parseErrorMessage}
            <div class="notification is-danger is-light p-3 m-3">
              <div class="is-flex is-align-items-center">
                <span class="icon mr-2"><i class="fas fa-triangle-exclamation"></i></span>
                <div class="is-size-7"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
              </div>
            </div>
          {/if}

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

          {#if loading}
            <div class="paisa-data-loading-state">
              <span class="icon is-large has-text-link">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
              </span>
              <p class="is-size-6 mt-2 has-text-weight-semibold">Parsing Spreadsheet Data…</p>
              <p class="is-size-7 has-text-grey">Extracting tabular rows and columns</p>
            </div>
          {/if}

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
                    <tr
                      class:selected={selectedSourceRowIndex === ri}
                      class:is-filtered={!rowIsVisible(ri)}
                      onclick={() => selectSourceRow(ri)}
                    >
                      <th class="paisa-sheet-row-header">
                        <span>{ri}</span>
                        <PredictionRowBadge
                          confidence={predictionReviewFailed ? null : summaryForRow(ri)?.confidence}
                          possibleTransfer={predictionReviewFailed ? false : summaryForRow(ri)?.possibleTransfer}
                        />
                      </th>
                      {#each row as cell}
                        <td class="paisa-sheet-data-cell" title={displayCell(cell)}>{displayCell(cell)}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            {#if !predictionReviewFailed}
              <PredictionDetail
                result={selectedPrediction}
                accounts={predictionSession.index?.accounts || []}
                onOverride={overrideSelected}
                onApplySimilar={applySimilar}
                onAlwaysUse={alwaysUseMerchant}
              />
            {/if}
          {/if}
        </div>

        <div class="paisa-import-pane paisa-preview-pane">
          <div class="paisa-pane-header">
            <div class="paisa-pane-title">
              <span class="icon is-small has-text-success"><i class="fas fa-file-invoice-dollar"></i></span>
              <span>Ledger Preview</span>
              {#if renderMetadata.generatedCount > 0}
                <span class="tag is-success is-light is-small">{renderMetadata.generatedCount} generated</span>
              {/if}
              {#if renderMetadata.errors.length > 0}
                <span class="tag is-danger is-light is-small">{renderMetadata.errors.length} errors</span>
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
                <span class="icon is-small"><i class="fas fa-copy"></i></span>
                <span>Copy</span>
              </button>
              <button
                data-tippy-content="Save to Ledger File"
                aria-label="Save"
                class="button is-small is-link save"
                disabled={_.isEmpty(preview)}
                onclick={openSaveModal}
              >
                <span class="icon is-small"><i class="fas fa-floppy-disk"></i></span>
                <span>Save</span>
              </button>
            </div>
          </div>
          <div class="paisa-preview-body">
            <div class="preview-editor" bind:this={previewEditorDom}></div>
            {#if _.isEmpty(preview) && _.isEmpty(data)}
              <div class="paisa-preview-placeholder">
                <span class="icon has-text-grey-light mb-2"><i class="fas fa-arrow-left fa-2x"></i></span>
                <p>Upload a statement to inspect generated journal transactions.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="paisa-import-statusbar">
        {#if parseErrorMessage}
          <span class="has-text-danger"><i class="fas fa-circle-xmark mr-1"></i> Parse failed</span>
        {:else if loading}
          <span class="has-text-link"><i class="fas fa-spinner fa-pulse mr-1"></i> Parsing source data</span>
        {:else if renderMetadata.generatedCount > 0}
          <span class="has-text-success"><i class="fas fa-circle-check mr-1"></i> {renderMetadata.generatedCount} transactions generated</span>
          {#if renderMetadata.errors.length > 0}
            <span class="has-text-danger"><i class="fas fa-triangle-exclamation mr-1"></i> {renderMetadata.errors.length} rows failed</span>
          {/if}
          {#if selectedSourceRowIndex !== null}
            <span class="has-text-grey">Row {selectedSourceRowIndex} selected</span>
          {/if}
          {#if predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown > 0}
            <span class="has-text-grey">High {predictionCounts.high}</span>
            <span class="has-text-grey">Medium {predictionCounts.medium}</span>
            <span class="has-text-warning">Review {predictionCounts.review}</span>
            <span class="has-text-danger">Unknown {predictionCounts.unknown}</span>
            {#if predictionCounts.transfer > 0}
              <span class="has-text-warning">Transfers {predictionCounts.transfer}</span>
            {/if}
          {/if}
        {:else if activeFileName}
          <span class="has-text-grey"><i class="fas fa-circle-info mr-1"></i> No transactions generated</span>
        {:else}
          <span class="has-text-grey"><i class="fas fa-circle-info mr-1"></i> Import a file to begin</span>
        {/if}
      </div>
    </div>
  </Section>
</Page>

<div class="paisa-template-drawer" class:is-open={templateDrawerOpen}>
  <button
    class="paisa-template-drawer-backdrop"
    aria-label="Close Template Definition"
    onclick={() => (templateDrawerOpen = false)}
  ></button>
  <aside class="paisa-template-drawer-panel" aria-label="Template Definition">
    <div class="paisa-template-drawer-header">
      <div class="paisa-pane-title">
        <span class="icon is-small has-text-link"><i class="fas fa-code"></i></span>
        <span>Template Definition</span>
        <span class="tag is-small is-link is-light">Handlebars</span>
      </div>
      <div class="paisa-template-drawer-actions">
        {#if $templateEditorState.hasUnsavedChanges}
          <span class="tag is-warning is-light is-small">
            <span class="paisa-unsaved-dot"></span> Unsaved
          </span>
        {/if}
        <button class="button is-small is-ghost" aria-label="Close Template Definition" onclick={() => (templateDrawerOpen = false)}>
          <span class="icon is-small"><i class="fas fa-xmark"></i></span>
        </button>
      </div>
    </div>
    <div class="paisa-template-drawer-body">
      <div class="template-editor" bind:this={templateEditorDom}></div>
    </div>
    <div class="paisa-template-drawer-footer">
      <button class="button is-small" onclick={() => (templateDrawerOpen = false)}>Cancel</button>
      <button
        class="button is-small is-link"
        data-tippy-content={templateSaveTooltip}
        onclick={save}
        disabled={templateSaveDisabled}
      >
        <span class="icon is-small"><i class="fas fa-floppy-disk"></i></span>
        <span>{selectedTemplateIsBuiltin ? "Save as Custom" : "Save"}</span>
      </button>
    </div>
  </aside>
</div>

<style lang="scss">
  .paisa-import-workspace {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    flex: 1 1 auto;
    min-height: 0;
  }

  .paisa-import-topbar,
  .paisa-import-statusbar,
  .paisa-import-pane {
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    box-shadow: var(--paisa-shadow-sm);
  }

  .paisa-import-topbar,
  .paisa-import-statusbar {
    flex-shrink: 0;
  }

  .paisa-import-topbar {
    position: relative;
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    align-content: flex-start;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-2);
    min-height: fit-content;
  }

  .paisa-import-template-block,
  .paisa-import-file-block,
  .paisa-import-topbar-actions,
  .paisa-data-controls,
  .paisa-pane-title,
  .paisa-editor-card-actions,
  .paisa-template-drawer-actions,
  .paisa-template-drawer-footer {
    display: flex;
    align-items: center;
  }

  .paisa-import-template-block,
  .paisa-import-file-block {
    gap: var(--paisa-space-2);
    min-width: 0;
    flex-wrap: wrap;
  }

  .paisa-import-template-block {
    flex: 1 1 28rem;
    max-width: 100%;
  }

  .paisa-import-file-block {
    flex: 1 1 12rem;
    max-width: 100%;
  }

  .paisa-import-select-wrapper {
    flex: 1;
    min-width: 180px;

    :global(.svelte-select) {
      border: 1px solid var(--paisa-border-default);
      background-color: var(--paisa-canvas-bg);
      border-radius: var(--paisa-radius-sm);
    }
  }

  .paisa-select-item-rendered,
  .paisa-select-item-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    width: 100%;
    overflow: hidden;
  }

  .paisa-template-name,
  .paisa-file-name {
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-file-name {
    max-width: 220px;
    font-size: var(--paisa-font-size-sm);
  }

  .paisa-import-topbar-actions,
  .paisa-editor-card-actions {
    gap: var(--paisa-space-1);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .paisa-data-controls {
    gap: var(--paisa-space-2);
    flex: 0 0 auto;
    flex-shrink: 0;
    flex-wrap: wrap;
    align-self: center;
    min-height: 2.5em;
  }

  .paisa-import-main-grid {
    display: grid;
    grid-template-columns: minmax(0, 55fr) minmax(0, 45fr);
    gap: var(--paisa-space-2);
    flex: 1;
    min-height: 0;
  }

  .paisa-import-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .paisa-pane-header,
  .paisa-template-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    min-height: 42px;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-subtle);
  }

  .paisa-pane-title {
    gap: var(--paisa-space-2);
    min-width: 0;
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    text-transform: uppercase;
    letter-spacing: 0;
  }

  .paisa-preview-body,
  .paisa-template-drawer-body {
    position: relative;
    flex: 1;
    min-height: 0;
    background-color: var(--paisa-canvas-bg);
  }

  .paisa-preview-body {
    :global(.cm-editor) {
      height: 100%;
      min-height: 100%;
      font-size: 0.85rem;
    }

    :global(.cm-scroller) {
      height: 100%;
    }
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

  .paisa-dropzone-container {
    padding: var(--paisa-space-3);
    border-bottom: 1px solid var(--paisa-border-subtle);

    &.has-file {
      padding: var(--paisa-space-2);
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

  .paisa-spreadsheet-grid-wrapper {
    flex: 1;
    min-height: 0;
    overflow: auto;
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

    tbody tr {
      cursor: pointer;

      &.selected {
        .paisa-sheet-row-header,
        .paisa-sheet-data-cell {
          background-color: var(--paisa-brand-primary-light);
          color: var(--paisa-text-primary);
        }
      }

      &:hover {
        .paisa-sheet-row-header {
          background-color: var(--paisa-surface-hover);
          color: var(--paisa-brand-primary);
        }

        .paisa-sheet-data-cell {
          background-color: var(--paisa-table-row-hover);
        }
      }
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
        display: block;
        font-weight: var(--paisa-font-weight-bold);
        font-size: var(--paisa-font-size-sm);
      }

      .paisa-col-tag {
        display: block;
        font-size: 0.68rem;
        color: var(--paisa-brand-primary);
        font-family: monospace;
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
      width: 88px;
      min-width: 88px;
      font-weight: var(--paisa-font-weight-semibold);
      vertical-align: middle;
    }

    tbody tr.is-filtered {
      display: none;
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
    }
  }

  .paisa-import-statusbar {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    min-height: 34px;
    padding: var(--paisa-space-1) var(--paisa-space-3);
    font-size: var(--paisa-font-size-xs);
  }

  .paisa-template-drawer {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
  }

  .paisa-template-drawer-backdrop {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    background-color: rgba(15, 23, 42, 0.32);
    cursor: default;
    opacity: 0;
    transition: opacity var(--paisa-transition-fast);
  }

  .paisa-template-drawer-panel {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    width: min(40vw, 560px);
    min-width: 420px;
    height: 100%;
    background-color: var(--paisa-surface-card);
    border-left: 1px solid var(--paisa-border-default);
    box-shadow: var(--paisa-shadow-lg);
    transform: translateX(100%);
    transition: transform var(--paisa-transition-fast);
  }

  .paisa-template-drawer.is-open {
    pointer-events: auto;

    .paisa-template-drawer-backdrop {
      opacity: 1;
    }

    .paisa-template-drawer-panel {
      transform: translateX(0);
    }
  }

  .paisa-template-drawer-actions,
  .paisa-template-drawer-footer {
    gap: var(--paisa-space-2);
  }

  .paisa-template-drawer-body {
    overflow: hidden;

    :global(.cm-editor) {
      height: 100%;
      min-height: 100%;
      font-size: 0.85rem;
    }

    :global(.cm-scroller) {
      height: 100%;
    }
  }

  .paisa-template-drawer-footer {
    justify-content: flex-end;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    border-top: 1px solid var(--paisa-border-subtle);
  }

  .paisa-unsaved-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--paisa-warning);
    margin-right: 4px;
  }

  .color-switch {
    display: inline-flex;
    align-items: center;
    position: relative;

    :global(.switch[type="checkbox"]:checked + label::before),
    :global(.switch[type="checkbox"]:checked + label:before) {
      background: var(--paisa-brand-primary);
    }
  }

  @media screen and (max-width: 768px) {
    .paisa-import-main-grid {
      grid-template-columns: 1fr;
    }

    .paisa-template-drawer-panel {
      width: 100%;
      min-width: 0;
    }
  }
</style>
