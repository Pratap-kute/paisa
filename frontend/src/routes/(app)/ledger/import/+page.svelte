<script lang="ts">
  import Select from "svelte-select";
  import Handlebars from "handlebars";
  import { editorState as templateEditorState } from "$lib/editors/template_editor";
  import {
    createEditor as createPreviewEditor,
    updateContent as updatePreviewContent
  } from "$lib/shared/editor/editor";
  import TemplateEditorDrawer from "$lib/features/importing/components/TemplateEditorDrawer.svelte";
  import FileDropzone from "$lib/shared/ui/FileDropzone.svelte";
  import {
    parse,
    asRows,
    renderWithMetadata,
    type RenderMetadata
  } from "$lib/features/importing/spreadsheet";
  import {
    commitParseOutcome,
    displayCell,
    emptyRenderMetadata,
  } from "$lib/features/importing/import_commit";
  import { range } from "es-toolkit";
  import { EditorView } from "@codemirror/view";
  import { onMount } from "svelte";
  import { ajax, type ImportTemplate } from "$lib/core/utils";
  import { accountTfIdf } from "../../../../store";
  import * as toast from "$lib/shared/ui/toast";
  import { ensureFileExtension } from "$lib/ledger/file";
  import FileModal from "$lib/features/ledger/components/FileModal.svelte";
  import Dialog from "$lib/shared/ui/Dialog.svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import Drawer from "$lib/shared/ui/Drawer.svelte";
  import Switch from "$lib/shared/ui/Switch.svelte";
  import Button from "$lib/shared/ui/Button.svelte";
  import Badge from "$lib/shared/ui/Badge.svelte";
  import FormField from "$lib/shared/layout/FormField.svelte";
  import Input from "$lib/shared/ui/Input.svelte";
  import IconButton from "$lib/shared/ui/IconButton.svelte";
  import PredictionReviewBar from "$lib/features/prediction/components/PredictionReviewBar.svelte";
  import PredictionRowBadge from "$lib/features/prediction/components/PredictionRowBadge.svelte";
  import PredictionDetail from "$lib/features/prediction/components/PredictionDetail.svelte";
  import SourceReviewList from "$lib/features/importing/components/SourceReviewList.svelte";
  import {
    predictionSession,
    rowMatchesFilter,
    type ConfidenceFilter,
  } from "$lib/features/prediction/session";
  import type { Confidence, PredictionResult } from "$lib/features/prediction/types";
import { assign, each, find, isEmpty, maxBy } from "$lib/shared/utils/collection";

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

  let previewEditorDom: Element = $state();
  let previewEditor: EditorView = $state();
  let showSaveAsModal = $state(false);
  let showFileModal = $state(false);

  let fileColumns = $derived.by(() => {
    if (rows && rows.length > 0) {
      return Object.keys(rows[0]).filter((k) => k !== "index");
    }
    return [];
  });

  onMount(async () => {
    const [tfidf, historyResponse] = await Promise.all([
      ajax("/api/account/tf_idf"),
      ajax("/api/prediction/history"),
    ]);
    accountTfIdf.set(tfidf);
    predictionSession.loadHistory(historyResponse.history || []);
    ({ templates } = await ajax("/api/templates"));
    if (templates.length > 0) {
      onSelectTemplate(templates[0]);
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

  let saveAsNameDuplicate = $derived(!!find(templates, { name: saveAsName, template_type: "custom" }));
  let selectedTemplateIsBuiltin = $derived(selectedTemplate?.template_type == "builtin");

  async function handleSaveTemplate(name: string, content: string) {
    const { template, saved, message } = await ajax("/api/templates/upsert", {
      method: "POST",
      body: JSON.stringify({
        name,
        content
      }),
      background: true
    });
    if (!saved) {
      toast.toast({
        message: `Failed to save template ${name}. reason: ${message}`,
        type: "is-danger",
        duration: 10000
      });
      return;
    }
    toast.toast({
      message: `Saved ${name}`,
      type: "is-success"
    });
    $templateEditorState = assign({}, $templateEditorState, { hasUnsavedChanges: false });
    ({ templates } = await ajax("/api/templates", { background: true }));
    selectedTemplate = template;
  }

  function builtinNotAllowed(action: string, template: ImportTemplate) {
    if (template?.template_type == "builtin") {
      return `Builtin template can't be ${action}`;
    }
    return "";
  }

  async function handleDeleteTemplate(templateToDelete: ImportTemplate) {
    const oldName = templateToDelete.name;
    const confirmed = confirm(`Are you sure you want to delete ${oldName} template?`);
    if (!confirmed) {
      return;
    }
    const { success, message } = await ajax("/api/templates/delete", {
      method: "POST",
      body: JSON.stringify({
        name: templateToDelete.name
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

    $templateEditorState = assign({}, $templateEditorState, { hasUnsavedChanges: false });
  }

  $effect(() => {
    const currentTemplate = $templateEditorState.template;
    const currentRows = rows;
    const currentReverse = options.reverse;
    const currentTrim = options.trim;
    const _tick = predictionTick;

    if (!isEmpty(currentRows) && currentTemplate) {
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
    } else if (isEmpty(currentRows)) {
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

        columnCount = maxBy(data, (row) => row.length)?.length || 0;
        each(data, (row) => {
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
    const renderedRow = find(renderMetadata.rows, { sourceRowIndex: rowIndex });
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
      return find(predictionRows, { rowIndex });
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
    let compiled: any = null;
    try {
      compiled = Handlebars.compile(template.content, { noEscape: true });
    } catch (e) {
      console.warn("Handlebars compile error on select:", e);
    }
    $templateEditorState = assign({}, $templateEditorState, {
      template: compiled,
      content: template.content,
      hasUnsavedChanges: false
    });
  }

  function openSaveModal() {
    if (!isEmpty(preview)) {
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

<Page
  width="fluid"
  class="box-border h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] overflow-hidden !pb-[var(--paisa-space-4)] [&_.paisa-page-content]:h-full [&_.paisa-page-content]:min-h-0 max-[860px]:!p-[var(--paisa-space-2)]"
>
  <div class="box-border flex h-full max-h-full min-h-0 w-full flex-col gap-[var(--paisa-space-2)] overflow-hidden">
    <div class="flex shrink-0 flex-col gap-[var(--paisa-space-2)] rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] p-[var(--paisa-space-2)] px-[var(--paisa-space-3)] shadow-[var(--paisa-shadow-sm)]">
      <div class="flex flex-wrap items-center justify-between gap-[var(--paisa-space-2)]">
        <div class="flex flex-wrap items-center gap-[var(--paisa-space-2)]">
          <h1 class="m-0 text-lg font-bold text-[var(--paisa-text-primary)]">Ledger Import</h1>

          {#if activeFileName}
            <div class="inline-flex items-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-0.5">
              <i class="fas fa-file-csv text-xs text-[var(--paisa-brand-primary)]"></i>
              <span class="max-w-[180px] truncate text-xs font-semibold text-[var(--paisa-text-primary)]" title={activeFileName}>{activeFileName}</span>
              <span class="rounded-[var(--paisa-radius-full)] bg-[var(--paisa-brand-primary-light)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--paisa-brand-primary)]">{data.length} rows</span>
              <button
                type="button"
                class="inline-flex min-h-[30px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-transparent bg-transparent px-2 py-1 text-xs font-medium text-[var(--paisa-text-secondary)] transition-all hover:bg-[var(--paisa-surface-muted)] hover:text-[var(--paisa-text-primary)]"
                onclick={clearLoadedFile}
                title="Replace with another file"
                aria-label="Replace File"
              >
                <i class="fas fa-arrow-rotate-right text-xs"></i>
                <span class="hidden sm:inline">Replace</span>
              </button>
            </div>
          {/if}
        </div>

        <div class="flex flex-wrap items-center gap-[var(--paisa-space-2)]">
          <div class="flex min-w-0 items-center gap-[var(--paisa-space-1)]">
            <div class="min-w-[180px] max-w-[260px] [&_.svelte-select]:min-h-8 [&_.svelte-select]:rounded-[var(--paisa-radius-sm)] [&_.svelte-select]:text-xs">
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
                <div slot="item" let:item class="flex w-full items-center justify-between gap-[var(--paisa-space-2)] overflow-hidden">
                  <span class="truncate font-semibold text-[var(--paisa-text-primary)]">{item.label}</span>
                  <Badge variant={item.template_type === "builtin" ? "info" : "primary"} size="sm">
                    {item.template_type}
                  </Badge>
                </div>
              </Select>
            </div>

            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                title="Edit active Handlebars template"
                ariaLabel="Edit Template"
                onclick={() => (templateDrawerOpen = true)}
              >
                {#snippet icon()}
                  <i class="fas fa-code"></i>
                {/snippet}
                <span class="hidden sm:inline">Edit Template</span>
                {#if $templateEditorState.hasUnsavedChanges}
                  <span class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--paisa-warning)]"></span>
                {/if}
              </Button>

              <IconButton
                variant="outline"
                size="sm"
                ariaLabel="Create Template"
                title="Create New Template"
                onclick={() => {
                  showSaveAsModal = true;
                  setTimeout(() => document.getElementById("template-name-input")?.focus(), 50);
                }}
              >
                <i class="fas fa-plus"></i>
              </IconButton>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex min-h-[30px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-transparent bg-transparent px-2 py-1 text-xs font-medium text-[var(--paisa-text-secondary)] transition-all hover:bg-[var(--paisa-surface-muted)] hover:text-[var(--paisa-text-primary)]"
            onclick={() => (advancedOptionsOpen = !advancedOptionsOpen)}
            aria-expanded={advancedOptionsOpen}
          >
            <span>Advanced Options</span>
            <i class="fas {advancedOptionsOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs"></i>
          </button>
        </div>
      </div>

      {#if advancedOptionsOpen}
        <div class="flex flex-wrap items-center justify-between gap-[var(--paisa-space-2)] border-t border-dashed border-[var(--paisa-border-subtle)] pt-[var(--paisa-space-2)]">
          <div class="flex items-center gap-[var(--paisa-space-4)]">
            <Switch id="import-reverse" bind:checked={options.reverse} size="sm" label="Reverse Row Order" />
            <Switch id="trim-reverse" bind:checked={options.trim} size="sm" label="Trim Whitespace" />
          </div>
          <span class="text-xs text-[var(--paisa-text-muted)]">Adjust row sequence or clean generated spacing</span>
        </div>
      {/if}
    </div>

    {#if isEmpty(data) && !loading}
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] p-[var(--paisa-space-6)]">
        <div class="w-full max-w-[540px] [&_.paisa-file-dropzone]:w-full [&_.paisa-file-dropzone]:cursor-pointer [&_.paisa-file-dropzone]:rounded-[var(--paisa-radius-md)] [&_.paisa-file-dropzone]:border-2 [&_.paisa-file-dropzone]:border-dashed [&_.paisa-file-dropzone]:border-[var(--paisa-border-default)] [&_.paisa-file-dropzone]:bg-[var(--paisa-canvas-bg)] [&_.paisa-file-dropzone]:transition-all [&_.paisa-file-dropzone]:duration-[var(--paisa-transition-fast)] hover:[&_.paisa-file-dropzone]:border-[var(--paisa-brand-primary)] hover:[&_.paisa-file-dropzone]:bg-[var(--paisa-brand-primary-light)]">
          <FileDropzone
            multiple={false}
            accept=".csv,.txt,.xls,.xlsx,.pdf,.CSV,.TXT,.XLS,.XLSX,.PDF"
            on:drop={handleFilesSelect}
          >
            <div class="flex flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-center">
              <div class="mb-[var(--paisa-space-3)] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--paisa-brand-primary-light)] text-[var(--paisa-brand-primary)]">
                <i class="fas fa-cloud-arrow-up fa-2x"></i>
              </div>
              <h2 class="mb-2 text-xl font-semibold text-[var(--paisa-text-primary)]">Drop your bank or card statement here</h2>
              <p class="mb-4 text-base text-[var(--paisa-text-secondary)]">Turn your financial statements into clean, verified ledger transactions</p>
              <div class="mb-4 flex flex-wrap items-center justify-center gap-1.5">
                <span class="rounded-[var(--paisa-radius-full)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--paisa-text-secondary)]">CSV</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--paisa-text-secondary)]">TXT</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--paisa-text-secondary)]">XLS / XLSX</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--paisa-text-secondary)]">PDF</span>
              </div>
              <div class="inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-brand-primary)] bg-[var(--paisa-brand-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110">
                <i class="fas fa-folder-open text-xs"></i>
                <span>Choose File</span>
              </div>
            </div>
          </FileDropzone>
        </div>

        {#if parseErrorMessage}
          <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)]/20 bg-[var(--paisa-danger-light)] p-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-[var(--paisa-danger)]"></i>
              <div class="text-xs"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
            </div>
          </div>
        {/if}
      </div>
    {:else if loading}
      <div class="flex flex-1 flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-[var(--paisa-text-primary)]">
        <i class="fas fa-spinner fa-pulse fa-2x text-[var(--paisa-brand-primary)]"></i>
        <p class="mt-2 text-base font-semibold">Parsing Spreadsheet Data…</p>
        <p class="text-xs text-[var(--paisa-text-secondary)]">Extracting tabular rows and columns</p>
      </div>
    {:else}
      <div class="hidden shrink-0 grid-cols-2 gap-2 max-[860px]:grid">
        <button
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border px-3 py-2 text-[0.8125rem] font-semibold transition-colors {mobileActiveTab === 'source' ? 'border-[var(--paisa-brand-primary)] bg-[var(--paisa-brand-primary)] text-white' : 'border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] text-[var(--paisa-text-secondary)]'}"
          onclick={() => (mobileActiveTab = "source")}
        >
          <i class="fas fa-table-cells text-xs"></i>
          <span>Source Data</span>
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border px-3 py-2 text-[0.8125rem] font-semibold transition-colors {mobileActiveTab === 'preview' ? 'border-[var(--paisa-brand-primary)] bg-[var(--paisa-brand-primary)] text-white' : 'border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] text-[var(--paisa-text-secondary)]'}"
          onclick={() => (mobileActiveTab = "preview")}
        >
          <i class="fas fa-file-invoice-dollar text-xs"></i>
          <span>Ledger Preview</span>
          {#if renderMetadata.generatedCount > 0}
            <span class="rounded-[var(--paisa-radius-full)] bg-white/25 px-1.5 py-0.5 text-[0.6875rem]">{renderMetadata.generatedCount}</span>
          {/if}
        </button>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-[minmax(380px,35%)_1fr] gap-[var(--paisa-space-2)] overflow-hidden max-[860px]:grid-cols-1">
        <div class="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)] {mobileActiveTab === 'preview' ? 'max-[860px]:hidden' : ''}">
          <div class="flex min-h-10 shrink-0 items-center justify-between gap-[var(--paisa-space-2)] border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2.5 py-1">
            <div class="inline-flex shrink-0 gap-0.5 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] p-0.5">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-sm)-2px)] border-0 px-2 py-0.5 text-[0.6875rem] font-medium transition-all {sourceViewMode === 'review' ? 'bg-[var(--paisa-brand-primary)] font-semibold text-white' : 'bg-transparent text-[var(--paisa-text-secondary)] hover:text-[var(--paisa-text-primary)]'}"
                onclick={() => (sourceViewMode = "review")}
              >
                <i class="fas fa-list-check text-xs"></i>
                <span>Review</span>
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-sm)-2px)] border-0 px-2 py-0.5 text-[0.6875rem] font-medium transition-all {sourceViewMode === 'raw' ? 'bg-[var(--paisa-brand-primary)] font-semibold text-white' : 'bg-transparent text-[var(--paisa-text-secondary)] hover:text-[var(--paisa-text-primary)]'}"
                onclick={() => (sourceViewMode = "raw")}
              >
                <i class="fas fa-table text-xs"></i>
                <span>Raw Data</span>
              </button>
            </div>

            {#if !predictionReviewFailed && (predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown) > 0}
              <div class="max-w-full overflow-x-auto">
                <PredictionReviewBar
                  counts={predictionCounts}
                  filter={predictionFilter}
                  onFilter={(next) => (predictionFilter = next)}
                />
              </div>
            {/if}
          </div>

          {#if parseErrorMessage}
            <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)]/20 bg-[var(--paisa-danger-light)] p-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-triangle-exclamation text-[var(--paisa-danger)]"></i>
                <div class="text-xs"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
              </div>
            </div>
          {/if}

          <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
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
              <div class="h-full min-h-0 flex-1 overflow-auto bg-[var(--paisa-table-bg)]">
                <table class="m-0 w-full min-w-full border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr>
                      <th class="sticky left-0 top-0 z-[15] w-10 min-w-10 border-[var(--paisa-table-border)] bg-[var(--paisa-table-header-bg)] px-[var(--paisa-space-2)] py-[var(--paisa-space-1)] text-center text-[var(--paisa-table-header-text)]">#</th>
                      {#each range(0, columnCount) as ci}
                        <th class="sticky top-0 z-10 min-w-[110px] border-[var(--paisa-table-border)] bg-[var(--paisa-table-header-bg)] px-[var(--paisa-space-2)] py-[var(--paisa-space-1)] text-center text-[var(--paisa-table-header-text)]">
                          <span class="block text-sm font-bold">{String.fromCharCode(65 + ci)}</span>
                          <span class="block font-mono text-[0.68rem] text-[var(--paisa-brand-primary)]">ROW.{String.fromCharCode(65 + ci)}</span>
                        </th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each data as row, ri}
                      <tr
                        class="cursor-pointer hover:[&_.paisa-sheet-data-cell]:bg-[var(--paisa-table-row-hover)] hover:[&_.paisa-sheet-row-header]:bg-[var(--paisa-surface-hover)] hover:[&_.paisa-sheet-row-header]:text-[var(--paisa-brand-primary)] {selectedSourceRowIndex === ri ? '[&_.paisa-sheet-data-cell]:bg-[var(--paisa-brand-primary-light)] [&_.paisa-sheet-data-cell]:text-[var(--paisa-text-primary)] [&_.paisa-sheet-row-header]:bg-[var(--paisa-brand-primary-light)] [&_.paisa-sheet-row-header]:text-[var(--paisa-text-primary)]' : ''} {!rowIsVisible(ri) ? 'hidden' : ''}"
                        onclick={() => selectSourceRow(ri)}
                      >
                        <th class="paisa-sheet-row-header sticky left-0 z-[5] w-[88px] min-w-[88px] border-[var(--paisa-table-border)] bg-[var(--paisa-table-header-bg)] px-[var(--paisa-space-2)] py-[var(--paisa-space-1)] text-center align-middle font-semibold text-[var(--paisa-table-header-text)]">
                          <span>{ri}</span>
                          <PredictionRowBadge
                            confidence={predictionReviewFailed ? null : summaryForRow(ri)?.confidence}
                            possibleTransfer={predictionReviewFailed ? false : summaryForRow(ri)?.possibleTransfer}
                          />
                        </th>
                        {#each row as cell}
                          <td class="paisa-sheet-data-cell max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap border-[var(--paisa-table-border)] bg-[var(--paisa-table-bg)] px-[var(--paisa-space-2)] py-[var(--paisa-space-1)] text-[var(--paisa-text-primary)]" title={displayCell(cell)}>{displayCell(cell)}</td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>

          {#if !predictionReviewFailed && selectedPrediction}
            <div class="max-h-[280px] shrink-0 overflow-y-auto border-t border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] max-[860px]:hidden">
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

        <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-[var(--paisa-shadow-sm)] {mobileActiveTab === 'source' ? 'max-[860px]:hidden' : ''}">
          <div class="flex min-h-10 shrink-0 items-center justify-between gap-[var(--paisa-space-2)] border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] px-2.5 py-1">
            <div class="flex min-w-0 items-center gap-[var(--paisa-space-2)] text-xs font-semibold uppercase tracking-wide text-[var(--paisa-text-primary)]">
              <i class="fas fa-file-invoice-dollar text-xs text-[var(--paisa-success)]"></i>
              <span>Ledger Preview</span>
              {#if renderMetadata.generatedCount > 0}
                <Badge variant="success" size="sm">{renderMetadata.generatedCount} generated</Badge>
              {/if}
              {#if renderMetadata.errors.length > 0}
                <Badge variant="danger" size="sm">{renderMetadata.errors.length} errors</Badge>
              {/if}
            </div>
            <div class="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                title="Copy Generated Ledger"
                ariaLabel="Copy to Clipboard"
                class="clipboard"
                disabled={isEmpty(preview)}
                onclick={copyToClipboard}
              >
                {#snippet icon()}
                  <i class="fas fa-copy"></i>
                {/snippet}
                Copy
              </Button>
              <Button
                variant="primary"
                size="sm"
                title="Save to Ledger File"
                ariaLabel="Save to Ledger"
                class="save"
                disabled={isEmpty(preview)}
                onclick={openSaveModal}
              >
                {#snippet icon()}
                  <i class="fas fa-floppy-disk"></i>
                {/snippet}
                Save to Ledger
              </Button>
            </div>
          </div>

          {#if renderMetadata.errors.length > 0}
            <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-warning)]/20 bg-[var(--paisa-warning-light)] p-3">
              <div class="text-xs"><strong>Template Errors:</strong> {renderMetadata.errors.length} rows encountered template rendering issues. Check Handlebars syntax or column mappings.</div>
            </div>
          {/if}

          <div class="relative min-h-0 h-full flex-1 overflow-hidden bg-[var(--paisa-canvas-bg)]">
            <div class="preview-editor h-full w-full [&_.cm-editor]:h-full [&_.cm-editor]:min-h-full [&_.cm-editor]:font-mono [&_.cm-editor]:text-[0.8125rem] [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto" use:initPreviewEditor></div>
            {#if isEmpty(preview) && isEmpty(data)}
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-[var(--paisa-space-4)] text-center text-xs text-[var(--paisa-text-muted)]">
                <i class="fas fa-arrow-left fa-2x mb-2 text-[var(--paisa-text-muted)]"></i>
                <p>Upload a statement to inspect generated journal transactions.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-between gap-[var(--paisa-space-3)] rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] px-3 py-1 text-xs shadow-[var(--paisa-shadow-sm)]">
        <div class="flex min-w-0 items-center gap-[var(--paisa-space-3)] overflow-x-auto">
          {#if parseErrorMessage}
            <span class="text-[var(--paisa-danger)]"><i class="fas fa-circle-xmark mr-1"></i> Parse failed</span>
          {:else if loading}
            <span class="text-[var(--paisa-brand-primary)]"><i class="fas fa-spinner fa-pulse mr-1"></i> Parsing source data…</span>
          {:else if renderMetadata.generatedCount > 0}
            <span class="text-[var(--paisa-success)]"><i class="fas fa-circle-check mr-1"></i> {renderMetadata.generatedCount} generated</span>
            {#if renderMetadata.errors.length > 0}
              <span class="text-[var(--paisa-danger)]"><i class="fas fa-triangle-exclamation mr-1"></i> {renderMetadata.errors.length} errors</span>
            {/if}
            {#if predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown > 0}
              <span class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 text-[var(--paisa-text-secondary)]"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-high)]"></span> {predictionCounts.high}</span>
                <span class="inline-flex items-center gap-1 text-[var(--paisa-text-secondary)]"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-medium)]"></span> {predictionCounts.medium}</span>
                <span class="inline-flex items-center gap-1 text-[var(--paisa-text-secondary)]"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-review)]"></span> {predictionCounts.review}</span>
                <span class="inline-flex items-center gap-1 text-[var(--paisa-text-secondary)]"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-unknown)]"></span> {predictionCounts.unknown}</span>
              </span>
            {/if}
          {:else if activeFileName}
            <span class="text-[var(--paisa-text-secondary)]"><i class="fas fa-circle-info mr-1"></i> No transactions generated</span>
          {:else}
            <span class="text-[var(--paisa-text-secondary)]"><i class="fas fa-circle-info mr-1"></i> Import a file to begin</span>
          {/if}
        </div>

        <div class="hidden max-[860px]:flex">
          <Button
            variant="primary"
            size="sm"
            class="min-h-11 px-4 text-[0.8125rem]"
            disabled={isEmpty(preview)}
            onclick={openSaveModal}
          >
            {#snippet icon()}
              <i class="fas fa-floppy-disk"></i>
            {/snippet}
            Save to Ledger
          </Button>
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

<!-- TEMPLATE EDITOR DRAWER -->
<TemplateEditorDrawer
  bind:open={templateDrawerOpen}
  {selectedTemplate}
  {templates}
  columns={fileColumns}
  onsave={handleSaveTemplate}
  ondelete={handleDeleteTemplate}
/>

<!-- FILE SAVE MODAL -->
<FileModal bind:open={showFileModal} onsave={saveToFile} />

<!-- TEMPLATE CREATE MODAL -->
<Dialog
  bind:open={showSaveAsModal}
  title="Create Import Template"
  onclose={() => (showSaveAsModal = false)}
>
  {#snippet children()}
    <FormField
      id="template-name-input"
      label="Template Name"
      error={saveAsNameDuplicate ? "A custom template with this name already exists." : undefined}
    >
      {#snippet children()}
        <Input
          id="template-name-input"
          size="sm"
          bind:value={saveAsName}
          placeholder="e.g. HDFC Bank Statement"
        />
      {/snippet}
    </FormField>
  {/snippet}
  {#snippet footer({ close })}
    <div class="flex w-full justify-end gap-2">
      <Button variant="ghost" size="sm" onclick={() => close()}>Cancel</Button>
      <Button
        variant="primary"
        size="sm"
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
      </Button>
    </div>
  {/snippet}
</Dialog>
