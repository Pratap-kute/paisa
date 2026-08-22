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
  import Drawer from "$lib/components/ui/Drawer.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import PredictionReviewBar from "$lib/components/prediction/PredictionReviewBar.svelte";
  import PredictionRowBadge from "$lib/components/prediction/PredictionRowBadge.svelte";
  import PredictionDetail from "$lib/components/prediction/PredictionDetail.svelte";
  import SourceReviewList from "$lib/components/import/SourceReviewList.svelte";
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
  let sourceViewMode: "review" | "raw" = $state("review");
  let mobileActiveTab: "source" | "preview" = $state("source");
  let advancedOptionsOpen = $state(false);
  let mobileInspectorOpen = $state(false);
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

  let templateItems = $derived(
    templates.map((t) => ({
      value: t,
      label: t.name,
      template_type: t.template_type,
    }))
  );

  let selectedTemplateOption = $derived(
    selectedTemplate
      ? {
          value: selectedTemplate,
          label: selectedTemplate.name,
          template_type: selectedTemplate.template_type,
        }
      : null
  );

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
  let showSaveAsModal = $state(false);
  let saveAsInput: HTMLInputElement = $state();
  let showFileModal = $state(false);

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
  });

  function initPreviewEditor(node: HTMLElement) {
    previewEditorDom = node;
    previewEditor = createPreviewEditor(preview, node, { readonly: true });
    if (preview) {
      updatePreviewContent(previewEditor, preview);
    }
    return {
      destroy() {
        previewEditor?.destroy?.();
      }
    };
  }

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
    const content = templateEditor ? templateEditor.state.doc.toString() : "";
    const { template, saved, message } = await ajax("/api/templates/upsert", {
      method: "POST",
      body: JSON.stringify({
        name: saveAsName,
        content
      }),
      background: true
    });
    if (!saved) {
      toast.toast({
        message: `Failed to save template ${saveAsName}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
      return;
    }
    toast.toast({
      message: `Saved ${saveAsName}`,
      type: "is-success"
    });
    $templateEditorState = _.assign({}, $templateEditorState, { hasUnsavedChanges: false });
    ({ templates } = await ajax("/api/templates", { background: true }));
    selectedTemplate = template;
  }

  function builtinNotAllowed(action: string, template: ImportTemplate) {
    if (template?.template_type == "builtin") {
      return `Builtin template can't be ${action}`;
    }
    return "";
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

    if (!_.isEmpty(currentRows) && currentTemplate) {
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
        if (previewEditor) {
          updatePreviewContent(previewEditor, generated.content);
        }
      } catch (e) {
        console.error(e);
        renderMetadata = emptyRenderMetadata;
        preview = "";
        if (previewEditor) {
          updatePreviewContent(previewEditor, "");
        }
      }
      refreshPredictionReview();
    } else if (_.isEmpty(currentRows)) {
      renderMetadata = { content: "", rows: [], generatedCount: 0, errors: [] };
      preview = "";
      if (previewEditor) {
        updatePreviewContent(previewEditor, "");
      }
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

        // Auto-select template if statement filename matches a known template
        const match = templates.find((t) => fileName.toLowerCase().includes(t.name.toLowerCase()));
        if (match) {
          onSelectTemplate(match);
        }

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
    data = [];
    rows = [];
    activeFileName = "";
    selectedSourceRowIndex = null;
    predictionSession.clearPreview();
    predictionFilter = null;
    predictionCounts = { high: 0, medium: 0, review: 0, unknown: 0, transfer: 0 };
    predictionRows = [];
    predictionReviewFailed = false;
    renderMetadata = { content: "", rows: [], generatedCount: 0, errors: [] };
    preview = "";
    if (previewEditor) {
      updatePreviewContent(previewEditor, "");
    }
  }

  function selectSourceRow(rowIndex: number) {
    selectedSourceRowIndex = rowIndex;
    if (typeof window !== "undefined" && window.innerWidth <= 860) {
      mobileInspectorOpen = true;
    }
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
    const summary = summaryForRow(rowIndex);
    return rowMatchesFilter(summary, predictionFilter);
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
    toast.toast({
      message: `Applied account to similar transactions`,
      type: "is-info",
      duration: 3000
    });
  }

  function alwaysUseMerchant(account: string) {
    if (!selectedPrediction) return;
    const key = selectedPrediction.merchantKey || "";
    predictionSession.alwaysUseMerchant(key, selectedPrediction.prefix, account);
    predictionTick += 1;
    toast.toast({
      message: `Saved rule: ${key} -> ${account}`,
      type: "is-success",
      duration: 4000
    });
  }

  function confirmNextReview() {
    const reviewQueue = predictionRows.filter((r) => r.confidence === "NEEDS_REVIEW" || r.confidence === "UNKNOWN");
    if (reviewQueue.length === 0) {
      selectedSourceRowIndex = null;
      mobileInspectorOpen = false;
      toast.toast({
        message: "All low-confidence rows reviewed!",
        type: "is-success"
      });
      return;
    }
    const currentPos = reviewQueue.findIndex((r) => r.rowIndex === selectedSourceRowIndex);
    const nextRow = reviewQueue[currentPos + 1] || reviewQueue[0];
    if (nextRow) {
      selectSourceRow(nextRow.rowIndex);
    } else {
      selectedSourceRowIndex = null;
      mobileInspectorOpen = false;
    }
  }

  function onSelectTemplate(template: ImportTemplate) {
    selectedTemplate = template;
    saveAsName = template.name;
    if (templateEditor) {
      updateTemplateContent(templateEditor, template.content);
    }
    $templateEditorState = _.assign({}, $templateEditorState, {
      template,
      content: template.content,
      hasUnsavedChanges: false
    });
  }

  function openSaveModal() {
    if (!_.isEmpty(preview)) {
      showFileModal = true;
    }
  }

  async function saveToFile(destinationFile: string) {
    const finalName = ensureFileExtension(destinationFile, ".ledger");
    const { saved, message } = await ajax("/api/editor/save", {
      method: "POST",
      body: JSON.stringify({ name: finalName, content: preview, operation: "overwrite" }),
      background: true
    });

    if (saved) {
      toast.toast({
        message: `Saved <b><a href="/ledger/editor/${encodeURIComponent(finalName)}">${finalName}</a></b>`,
        type: "is-success",
      });
    } else {
      toast.toast({
        message: `Failed to save ${finalName}. reason: ${message}`,
        type: "is-danger",
        duration: 10000,
      });
    }
  }

  function copyToClipboard() {
    if (!preview) return;
    navigator.clipboard.writeText(preview).then(() => {
      toast.toast({
        message: "Generated ledger copied to clipboard",
        type: "is-success",
        duration: 3000
      });
    });
  }
</script>

<svelte:head>
  <title>Ledger Import - Paisa</title>
</svelte:head>

<Page width="fluid">
  <div class="paisa-import-workspace">
    <!-- TOP TOOLBAR -->
    <div class="paisa-import-topbar">
      <div class="paisa-import-header-main">
        <!-- Left: Page Title & File Context -->
        <div class="paisa-import-title-group">
          <h1 class="paisa-import-page-title">Ledger Import</h1>

          {#if activeFileName}
            <div class="paisa-file-badge">
              <span class="icon is-small has-text-link"><i class="fas fa-file-csv"></i></span>
              <span class="paisa-file-name" title={activeFileName}>{activeFileName}</span>
              <span class="paisa-file-count-badge">{data.length} rows</span>
              <button
                type="button"
                class="paisa-btn-subtle paisa-replace-btn"
                onclick={clearLoadedFile}
                title="Replace with another file"
                aria-label="Replace File"
              >
                <span class="icon is-small"><i class="fas fa-arrow-rotate-right"></i></span>
                <span class="is-hidden-mobile">Replace</span>
              </button>
            </div>
          {/if}
        </div>

        <!-- Right: Template Selector & Actions -->
        <div class="paisa-import-controls-group">
          <div class="paisa-import-template-control">
            <div class="paisa-import-select-wrapper">
              <Select
                items={templateItems}
                value={selectedTemplateOption}
                placeholder="Select Template…"
                showChevron={true}
                searchable={true}
                clearable={false}
                on:change={(e) => {
                  if (e.detail?.value) onSelectTemplate(e.detail.value);
                }}
              >
                <div slot="item" let:item class="paisa-select-item-option">
                  <span class="paisa-template-name">{item.label}</span>
                  <span class="tag is-small {item.template_type === 'builtin' ? 'is-light is-info' : 'is-light is-primary'}">
                    {item.template_type}
                  </span>
                </div>
              </Select>
            </div>

            <div class="paisa-template-btn-group">
              <button
                type="button"
                class="paisa-btn-secondary"
                onclick={() => (templateDrawerOpen = true)}
                title="Edit active Handlebars template"
                aria-label="Edit Template"
              >
                <span class="icon is-small"><i class="fas fa-code"></i></span>
                <span class="is-hidden-mobile">Edit Template</span>
                {#if $templateEditorState.hasUnsavedChanges}
                  <span class="paisa-unsaved-dot"></span>
                {/if}
              </button>

              <button
                type="button"
                class="paisa-btn-icon"
                onclick={() => {
                  showSaveAsModal = true;
                  setTimeout(() => saveAsInput?.focus(), 50);
                }}
                title="Create New Template"
                aria-label="Create Template"
              >
                <span class="icon is-small"><i class="fas fa-plus"></i></span>
              </button>

              <button
                type="button"
                class="paisa-btn-icon"
                data-tippy-content={templateSaveTooltip}
                disabled={templateSaveDisabled}
                aria-label="Save Template"
                onclick={save}
              >
                <span class="icon is-small"><i class="fas {selectedTemplateIsBuiltin ? 'fa-code-fork' : 'fa-floppy-disk'}"></i></span>
              </button>

              {#if !selectedTemplateIsBuiltin}
                <button
                  type="button"
                  class="paisa-btn-icon is-danger"
                  data-tippy-content={builtinNotAllowed("Delete", selectedTemplate)}
                  aria-label="Delete Template"
                  onclick={(_e) => remove()}
                >
                  <span class="icon is-small"><i class="fas fa-trash-can"></i></span>
                </button>
              {/if}
            </div>
          </div>

          <!-- Advanced Options Toggle -->
          <button
            type="button"
            class="paisa-btn-subtle"
            onclick={() => (advancedOptionsOpen = !advancedOptionsOpen)}
            aria-expanded={advancedOptionsOpen}
          >
            <span>Advanced Options</span>
            <span class="icon is-small"><i class="fas {advancedOptionsOpen ? 'fa-chevron-up' : 'fa-chevron-down'}"></i></span>
          </button>
        </div>
      </div>

      {#if advancedOptionsOpen}
        <div class="paisa-advanced-options-bar">
          <div class="paisa-advanced-switches">
            <Switch id="import-reverse" bind:checked={options.reverse} size="sm" label="Reverse Row Order" />
            <Switch id="trim-reverse" bind:checked={options.trim} size="sm" label="Trim Whitespace" />
          </div>
          <span class="paisa-advanced-hint">Adjust row sequence or clean generated spacing</span>
        </div>
      {/if}
    </div>

    <!-- MAIN WORKSPACE -->
    {#if _.isEmpty(data) && !loading}
      <!-- EMPTY / INITIAL STATE -->
      <div class="paisa-empty-import-hero">
        <div class="paisa-dropzone-container">
          <FileDropzone
            multiple={false}
            accept=".csv,.txt,.xls,.xlsx,.pdf,.CSV,.TXT,.XLS,.XLSX,.PDF"
            on:drop={handleFilesSelect}
          >
            <div class="paisa-dropzone-content-empty">
              <div class="paisa-dropzone-icon-circle">
                <i class="fas fa-cloud-arrow-up fa-2x"></i>
              </div>
              <h2 class="title is-5 mb-2">Drop your bank or card statement here</h2>
              <p class="subtitle is-6 has-text-grey mb-4">Turn your financial statements into clean, verified ledger transactions</p>
              <div class="paisa-format-chips mb-4">
                <span class="paisa-format-chip">CSV</span>
                <span class="paisa-format-chip">TXT</span>
                <span class="paisa-format-chip">XLS / XLSX</span>
                <span class="paisa-format-chip">PDF</span>
              </div>
              <div class="paisa-btn-primary">
                <span class="icon is-small mr-1"><i class="fas fa-folder-open"></i></span>
                <span>Choose File</span>
              </div>
            </div>
          </FileDropzone>
        </div>

        {#if parseErrorMessage}
          <div class="notification is-danger is-light p-3 m-3">
            <div class="is-flex is-align-items-center">
              <span class="icon mr-2"><i class="fas fa-triangle-exclamation"></i></span>
              <div class="is-size-7"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
            </div>
          </div>
        {/if}
      </div>
    {:else if loading}
      <!-- LOADING STATE -->
      <div class="paisa-data-loading-state">
        <span class="icon is-large has-text-link">
          <i class="fas fa-spinner fa-pulse fa-2x"></i>
        </span>
        <p class="is-size-6 mt-2 has-text-weight-semibold">Parsing Spreadsheet Data…</p>
        <p class="is-size-7 has-text-grey">Extracting tabular rows and columns</p>
      </div>
    {:else}
      <!-- LOADED WORKSPACE (DESKTOP SPLIT / MOBILE TABS) -->

      <!-- MOBILE TAB BAR -->
      <div class="paisa-mobile-view-tabs">
        <button
          type="button"
          class="paisa-mobile-tab-btn"
          class:is-active={mobileActiveTab === "source"}
          onclick={() => (mobileActiveTab = "source")}
        >
          <span class="icon is-small"><i class="fas fa-table-cells"></i></span>
          <span>Source Data</span>
        </button>
        <button
          type="button"
          class="paisa-mobile-tab-btn"
          class:is-active={mobileActiveTab === "preview"}
          onclick={() => (mobileActiveTab = "preview")}
        >
          <span class="icon is-small"><i class="fas fa-file-invoice-dollar"></i></span>
          <span>Ledger Preview</span>
          {#if renderMetadata.generatedCount > 0}
            <span class="paisa-tab-count-pill">{renderMetadata.generatedCount}</span>
          {/if}
        </button>
      </div>

      <div class="paisa-import-main-grid" class:is-mobile-preview-active={mobileActiveTab === "preview"}>
        <!-- SOURCE DATA PANE (~35% desktop) -->
        <div class="paisa-import-pane paisa-source-pane" class:paisa-hide-on-mobile-preview={mobileActiveTab === "preview"}>
          <div class="paisa-pane-header">
            <div class="paisa-source-view-switcher">
              <button
                type="button"
                class="paisa-view-mode-btn"
                class:is-active={sourceViewMode === "review"}
                onclick={() => (sourceViewMode = "review")}
              >
                <span class="icon is-small"><i class="fas fa-list-check"></i></span>
                <span>Review</span>
              </button>
              <button
                type="button"
                class="paisa-view-mode-btn"
                class:is-active={sourceViewMode === "raw"}
                onclick={() => (sourceViewMode = "raw")}
              >
                <span class="icon is-small"><i class="fas fa-table"></i></span>
                <span>Raw Data</span>
              </button>
            </div>

            {#if !predictionReviewFailed && (predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown) > 0}
              <div class="paisa-review-filter-wrap">
                <PredictionReviewBar
                  counts={predictionCounts}
                  filter={predictionFilter}
                  onFilter={(next) => (predictionFilter = next)}
                />
              </div>
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

          <!-- SOURCE BODY -->
          <div class="paisa-source-body">
            {#if sourceViewMode === "review"}
              <SourceReviewList
                {data}
                {renderMetadata}
                {predictionRows}
                {selectedSourceRowIndex}
                {predictionFilter}
                onSelectRow={selectSourceRow}
              />
            {:else}
              <!-- RAW DATA TABLE -->
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
            {/if}
          </div>

          <!-- DESKTOP SELECTED ROW REVIEW INSPECTOR -->
          {#if !predictionReviewFailed && selectedPrediction}
            <div class="paisa-desktop-inspector-wrap">
              <PredictionDetail
                result={selectedPrediction}
                accounts={predictionSession.index?.accounts || []}
                onOverride={overrideSelected}
                onApplySimilar={applySimilar}
                onAlwaysUse={alwaysUseMerchant}
                onConfirmNext={confirmNextReview}
                onClose={() => (selectedSourceRowIndex = null)}
              />
            </div>
          {/if}
        </div>

        <!-- LEDGER PREVIEW PANE (~65% desktop) -->
        <div class="paisa-import-pane paisa-preview-pane" class:paisa-hide-on-mobile-source={mobileActiveTab === "source"}>
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
                class="button is-small clipboard paisa-btn-secondary"
                disabled={_.isEmpty(preview)}
                onclick={copyToClipboard}
              >
                <span class="icon is-small"><i class="fas fa-copy"></i></span>
                <span>Copy</span>
              </button>
              <button
                data-tippy-content="Save to Ledger File"
                aria-label="Save"
                class="button is-small is-link save paisa-btn-primary"
                disabled={_.isEmpty(preview)}
                onclick={openSaveModal}
              >
                <span class="icon is-small"><i class="fas fa-floppy-disk"></i></span>
                <span>Save to Ledger</span>
              </button>
            </div>
          </div>

          {#if renderMetadata.errors.length > 0}
            <div class="notification is-warning is-light p-3 m-3">
              <div class="is-size-7"><strong>Template Errors:</strong> {renderMetadata.errors.length} rows encountered template rendering issues. Check Handlebars syntax or column mappings.</div>
            </div>
          {/if}

          <div class="paisa-preview-body">
            <div class="preview-editor" use:initPreviewEditor></div>
            {#if _.isEmpty(preview) && _.isEmpty(data)}
              <div class="paisa-preview-placeholder">
                <span class="icon has-text-grey-light mb-2"><i class="fas fa-arrow-left fa-2x"></i></span>
                <p>Upload a statement to inspect generated journal transactions.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- STATUS BAR -->
      <div class="paisa-import-statusbar">
        <div class="paisa-statusbar-info">
          {#if parseErrorMessage}
            <span class="has-text-danger"><i class="fas fa-circle-xmark mr-1"></i> Parse failed</span>
          {:else if loading}
            <span class="has-text-link"><i class="fas fa-spinner fa-pulse mr-1"></i> Parsing source data…</span>
          {:else if renderMetadata.generatedCount > 0}
            <span class="has-text-success"><i class="fas fa-circle-check mr-1"></i> {renderMetadata.generatedCount} generated</span>
            {#if renderMetadata.errors.length > 0}
              <span class="has-text-danger"><i class="fas fa-triangle-exclamation mr-1"></i> {renderMetadata.errors.length} errors</span>
            {/if}
            {#if predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown > 0}
              <span class="paisa-status-dot-group">
                <span class="paisa-dot-count"><span class="paisa-dot-sm bg-emerald-500"></span> {predictionCounts.high}</span>
                <span class="paisa-dot-count"><span class="paisa-dot-sm bg-blue-500"></span> {predictionCounts.medium}</span>
                <span class="paisa-dot-count"><span class="paisa-dot-sm bg-amber-500"></span> {predictionCounts.review}</span>
                <span class="paisa-dot-count"><span class="paisa-dot-sm bg-rose-500"></span> {predictionCounts.unknown}</span>
              </span>
            {/if}
          {:else if activeFileName}
            <span class="has-text-grey"><i class="fas fa-circle-info mr-1"></i> No transactions generated</span>
          {:else}
            <span class="has-text-grey"><i class="fas fa-circle-info mr-1"></i> Import a file to begin</span>
          {/if}
        </div>

        <!-- Mobile Persistent Save Action -->
        <div class="paisa-statusbar-mobile-actions">
          <button
            type="button"
            class="paisa-btn-primary paisa-mobile-save-btn"
            disabled={_.isEmpty(preview)}
            onclick={openSaveModal}
          >
            <span class="icon is-small"><i class="fas fa-floppy-disk"></i></span>
            <span>Save to Ledger</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</Page>

<!-- MOBILE INSPECTOR DRAWER -->
<Drawer title="Selected Row Review" bind:open={mobileInspectorOpen} side="right">
  {#snippet children()}
    {#if selectedPrediction}
      <PredictionDetail
        result={selectedPrediction}
        accounts={predictionSession.index?.accounts || []}
        onOverride={overrideSelected}
        onApplySimilar={applySimilar}
        onAlwaysUse={alwaysUseMerchant}
        onConfirmNext={confirmNextReview}
        onClose={() => (mobileInspectorOpen = false)}
      />
    {:else}
      <div class="p-4 text-center text-sm text-gray-500">
        Select a row from the Review or Raw Data list to inspect and override.
      </div>
    {/if}
  {/snippet}
</Drawer>

<!-- TEMPLATE SLIDE-OVER DRAWER -->
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

<!-- FILE SAVE MODAL -->
<FileModal bind:open={showFileModal} onsave={saveToFile} />

<!-- TEMPLATE CREATE MODAL -->
{#if showSaveAsModal}
  <Modal
    active={showSaveAsModal}
    title="Create Import Template"
    onclose={() => (showSaveAsModal = false)}
  >
    {#snippet body()}
      <div class="field">
        <label class="label is-small" for="template-name-input">Template Name</label>
        <div class="control">
          <input
            id="template-name-input"
            class="input is-small"
            type="text"
            bind:this={saveAsInput}
            bind:value={saveAsName}
            placeholder="e.g. HDFC Bank Statement"
          />
        </div>
        {#if saveAsNameDuplicate}
          <p class="help is-danger">A custom template with this name already exists.</p>
        {/if}
      </div>
    {/snippet}
    {#snippet foot({ close })}
      <div class="is-flex is-justify-content-flex-end gap-2 w-full">
        <button class="button is-small" onclick={close}>Cancel</button>
        <button
          class="button is-small is-link"
          disabled={!saveAsName || saveAsNameDuplicate}
          onclick={async () => {
            close();
            const { template, saved, message } = await ajax("/api/templates/upsert", {
              method: "POST",
              body: JSON.stringify({
                name: saveAsName,
                content: selectedTemplate?.content || ""
              }),
              background: true
            });
            if (saved) {
              ({ templates } = await ajax("/api/templates", { background: true }));
              onSelectTemplate(template);
              toast.toast({
                message: `Created template ${saveAsName}`,
                type: "is-success"
              });
            } else {
              toast.toast({
                message: `Failed to create template: ${message}`,
                type: "is-danger"
              });
            }
          }}
        >
          Create
        </button>
      </div>
    {/snippet}
  </Modal>
{/if}

<style lang="scss">
  :global(.paisa-page-container:has(.paisa-import-workspace)) {
    height: calc(100vh - 3.5rem);
    max-height: calc(100vh - 3.5rem);
    overflow: hidden;
    padding-bottom: var(--paisa-space-4) !important;
    box-sizing: border-box;
  }

  .paisa-import-workspace {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    overflow: hidden;
    gap: var(--paisa-space-2);
    box-sizing: border-box;
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
    display: flex;
    flex-direction: column;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    gap: var(--paisa-space-2);
  }

  .paisa-import-header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
  }

  .paisa-import-title-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
  }

  .paisa-import-page-title {
    font-size: var(--paisa-font-size-lg, 1.125rem);
    font-weight: var(--paisa-font-weight-bold, 700);
    color: var(--paisa-text-primary);
    margin: 0;
  }

  .paisa-file-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.2rem 0.5rem;
    background-color: var(--paisa-surface-muted);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-sm);
  }

  .paisa-file-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--paisa-text-primary);
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-file-count-badge {
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.1rem 0.375rem;
    background-color: var(--paisa-brand-primary-light);
    color: var(--paisa-brand-primary);
    border-radius: var(--paisa-radius-full, 9999px);
  }

  .paisa-import-controls-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
  }

  .paisa-import-template-control {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-1);
    min-width: 0;
  }

  .paisa-import-select-wrapper {
    min-width: 180px;
    max-width: 260px;

    :global(.svelte-select) {
      border: 1px solid var(--paisa-border-default);
      background-color: var(--paisa-canvas-bg);
      border-radius: var(--paisa-radius-sm);
      min-height: 32px;
      font-size: 0.75rem;
    }
  }

  .paisa-select-item-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    width: 100%;
    overflow: hidden;
  }

  .paisa-template-name {
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-template-btn-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .paisa-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    min-height: 32px;
    border-radius: var(--paisa-radius-sm);
    border: 1px solid var(--paisa-brand-primary);
    background-color: var(--paisa-brand-primary);
    color: #ffffff;
    cursor: pointer;
    transition: filter 0.15s ease;

    &:hover {
      filter: brightness(1.08);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .paisa-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.375rem 0.625rem;
    min-height: 32px;
    border-radius: var(--paisa-radius-sm);
    border: 1px solid var(--paisa-border-default);
    background-color: var(--paisa-surface-card);
    color: var(--paisa-text-primary);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--paisa-surface-hover);
      border-color: var(--paisa-border-focus);
    }
  }

  .paisa-btn-subtle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    min-height: 30px;
    border-radius: var(--paisa-radius-sm);
    border: 1px solid transparent;
    background-color: transparent;
    color: var(--paisa-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--paisa-surface-muted);
      color: var(--paisa-text-primary);
    }
  }

  .paisa-btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--paisa-radius-sm);
    border: 1px solid var(--paisa-border-default);
    background-color: var(--paisa-surface-card);
    color: var(--paisa-text-primary);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: var(--paisa-surface-hover);
    }

    &.is-danger {
      color: var(--paisa-danger);
      &:hover {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: var(--paisa-danger);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .paisa-advanced-options-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--paisa-space-2);
    padding-top: var(--paisa-space-2);
    border-top: 1px dashed var(--paisa-border-subtle);
  }

  .paisa-advanced-switches {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-4);
  }

  .paisa-advanced-hint {
    font-size: 0.75rem;
    color: var(--paisa-text-muted);
  }

  /* EMPTY HERO */
  .paisa-empty-import-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 0;
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
    padding: var(--paisa-space-6);
  }

  .paisa-dropzone-container {
    width: 100%;
    max-width: 540px;

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
    padding: var(--paisa-space-6) var(--paisa-space-4);
    text-align: center;
  }

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

  .paisa-format-chips {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .paisa-format-chip {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: var(--paisa-radius-full, 9999px);
    background-color: var(--paisa-surface-muted);
    color: var(--paisa-text-secondary);
    border: 1px solid var(--paisa-border-subtle);
  }

  .paisa-data-loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--paisa-space-6) var(--paisa-space-4);
    color: var(--paisa-text-primary);
    flex: 1;
  }

  /* MOBILE TABS */
  .paisa-mobile-view-tabs {
    display: none;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .paisa-mobile-tab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    min-height: 44px;
    font-size: 0.8125rem;
    font-weight: 600;
    border-radius: var(--paisa-radius-sm);
    border: 1px solid var(--paisa-border-default);
    background-color: var(--paisa-surface-card);
    color: var(--paisa-text-secondary);
    cursor: pointer;

    &.is-active {
      background-color: var(--paisa-brand-primary);
      border-color: var(--paisa-brand-primary);
      color: #ffffff;
    }
  }

  .paisa-tab-count-pill {
    font-size: 0.6875rem;
    padding: 0.125rem 0.375rem;
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: var(--paisa-radius-full, 9999px);
  }

  /* MAIN GRID WORKSPACE */
  .paisa-import-main-grid {
    display: grid;
    grid-template-columns: minmax(380px, 35%) 1fr;
    gap: var(--paisa-space-2);
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .paisa-import-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .paisa-source-pane {
    position: relative;
  }

  .paisa-source-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .paisa-desktop-inspector-wrap {
    flex-shrink: 0;
    max-height: 280px;
    overflow-y: auto;
    border-top: 1px solid var(--paisa-border-default);
    background-color: var(--paisa-surface-card);
  }

  .paisa-pane-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    min-height: 40px;
    padding: 0.25rem 0.625rem;
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-subtle);
    flex-shrink: 0;
  }

  .paisa-source-view-switcher {
    display: inline-flex;
    background-color: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-default);
    border-radius: var(--paisa-radius-sm);
    padding: 2px;
    gap: 2px;
    flex-shrink: 0;
  }

  .paisa-view-mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.2rem 0.5rem;
    border-radius: calc(var(--paisa-radius-sm) - 2px);
    border: none;
    background: transparent;
    color: var(--paisa-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: var(--paisa-text-primary);
    }

    &.is-active {
      background-color: var(--paisa-brand-primary);
      color: #ffffff;
      font-weight: 600;
    }
  }

  .paisa-review-filter-wrap {
    overflow-x: auto;
    max-width: 100%;
  }

  .paisa-pane-title {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    min-width: 0;
    font-size: var(--paisa-font-size-xs, 0.75rem);
    font-weight: var(--paisa-font-weight-semibold, 600);
    color: var(--paisa-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .paisa-editor-card-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .paisa-preview-body {
    position: relative;
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    background-color: var(--paisa-canvas-bg);

    .preview-editor {
      width: 100%;
      height: 100%;
    }

    :global(.cm-editor) {
      height: 100%;
      min-height: 100%;
      font-size: 0.8125rem;
      font-family: var(--paisa-font-mono, monospace);
    }

    :global(.cm-scroller) {
      height: 100%;
      overflow: auto;
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

  /* RAW SPREADSHEET TABLE */
  .paisa-spreadsheet-grid-wrapper {
    flex: 1;
    min-height: 0;
    height: 100%;
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
    justify-content: space-between;
    gap: var(--paisa-space-3);
    min-height: 32px;
    padding: 0.25rem 0.75rem;
    font-size: var(--paisa-font-size-xs, 0.75rem);
    flex-shrink: 0;
  }

  .paisa-statusbar-info {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    min-width: 0;
    overflow-x: auto;
  }

  .paisa-status-dot-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .paisa-dot-count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--paisa-text-secondary);
  }

  .paisa-dot-sm {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .paisa-statusbar-mobile-actions {
    display: none;
  }

  .paisa-mobile-save-btn {
    min-height: 44px;
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
  }

  /* TEMPLATE DRAWER */
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
    width: min(45vw, 620px);
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

  .paisa-template-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--paisa-space-3);
    background-color: var(--paisa-surface-muted);
    border-bottom: 1px solid var(--paisa-border-subtle);
  }

  .paisa-template-drawer-actions,
  .paisa-template-drawer-footer {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
  }

  .paisa-template-drawer-body {
    position: relative;
    flex: 1;
    min-height: 0;
    background-color: var(--paisa-canvas-bg);
    overflow: hidden;

    :global(.cm-editor) {
      height: 100%;
      min-height: 100%;
      font-size: 0.85rem;
      font-family: var(--paisa-font-mono, monospace);
    }

    :global(.cm-scroller) {
      height: 100%;
    }
  }

  .paisa-template-drawer-footer {
    justify-content: flex-end;
    padding: var(--paisa-space-3);
    border-top: 1px solid var(--paisa-border-subtle);
  }

  .paisa-unsaved-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--paisa-warning);
  }

  @media screen and (max-width: 860px) {
    :global(.paisa-page-container:has(.paisa-import-workspace)) {
      padding: var(--paisa-space-2) !important;
      height: calc(100vh - 3.5rem);
      max-height: calc(100vh - 3.5rem);
    }

    .paisa-mobile-view-tabs {
      display: grid;
    }

    .paisa-import-main-grid {
      grid-template-columns: 1fr;
    }

    .paisa-hide-on-mobile-preview {
      display: none !important;
    }

    .paisa-hide-on-mobile-source {
      display: none !important;
    }

    .paisa-desktop-inspector-wrap {
      display: none;
    }

    .paisa-statusbar-mobile-actions {
      display: flex;
    }

    .paisa-template-drawer-panel {
      width: 100%;
      min-width: 0;
    }
  }
</style>
