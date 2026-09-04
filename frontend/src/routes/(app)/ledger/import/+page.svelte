<script lang="ts">
import { api } from "$lib/api";
import Select from "svelte-select";
import Handlebars from "handlebars";
import type { ImportTemplate } from "$lib/features/importing/types";
import type { PredictionHistoryEntry } from "$lib/features/prediction/types_api";
import type { AccountTfIdf } from "$lib/shared/state/models";
import { editorState as templateEditorState } from "$lib/features/editor/template_editor";
import {
  createEditor as createPreviewEditor,
  updateContent as updatePreviewContent,
} from "$lib/features/editor/runtime";
import TemplateEditorDrawer from "$lib/features/importing/components/TemplateEditorDrawer.svelte";
import FileDropzone from "$lib/shared/ui/FileDropzone.svelte";
import {
  asRows,
  parse,
  type RenderMetadata,
  renderWithMetadata,
} from "$lib/features/importing/spreadsheet";
import {
  commitParseOutcome,
  displayCell,
  emptyRenderMetadata,
} from "$lib/features/importing/import_commit";
import { range } from "es-toolkit";
import { EditorView } from "@codemirror/view";
import { onMount } from "svelte";
import { accountTfIdf } from "../../../../store";
import * as toast from "$lib/shared/ui/toast";
import { ensureFileExtension } from "$lib/features/ledger/file";
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
  type ConfidenceFilter,
  predictionSession,
  rowMatchesFilter,
} from "$lib/features/prediction/session";
import type {
  Confidence,
  PredictionResult,
} from "$lib/features/prediction/types";
import {
  assign,
  each,
  find,
  isEmpty,
  maxBy,
} from "$lib/shared/utils/collection";

let templates: ImportTemplate[] = $state([]);
let selectedTemplate: ImportTemplate | undefined = $state();
let saveAsName = $state("");
let preview = $state("");
let parseErrorMessage: string | null = $state(null);
let columnCount: number = $state(0);
let data: any[][] = $state([]);
let rows: Array<Record<string, any>> = $state([]);
let options: { reverse: boolean; trim: boolean } = $state({
  reverse: false,
  trim: true,
});
let loading = $state(false);
let activeFileName = $state("");
let templateDrawerOpen = $state(false);
let selectedSourceRowIndex: number | null = $state(null);
let selectedInvocationIndex = $state(0);
let showReviewWarningModal = $state(false);
let predictionTick = $state(0);
let predictionFilter: ConfidenceFilter = $state(null);
let sourceViewMode: "review" | "raw" = $state("review");
let mobileActiveTab: "source" | "preview" = $state("source");
let advancedOptionsOpen = $state(false);

let activeFileMeta = $derived.by(() => {
  if (!activeFileName) {
    return {
      icon: "fa-solid fa-file-lines",
      color: "text-primary",
    };
  }
  const ext = activeFileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    return { icon: "fa-solid fa-file-excel", color: "text-primary" };
  } else if (ext === "pdf") {
    return { icon: "fa-solid fa-file-pdf", color: "text-primary" };
  } else if (ext === "csv") {
    return { icon: "fa-solid fa-file-csv", color: "text-primary" };
  }
  return { icon: "fa-solid fa-file-lines", color: "text-muted-foreground" };
});
let mobileInspectorOpen = $state(false);
let predictionCounts = $state({
  high: 0,
  medium: 0,
  review: 0,
  unknown: 0,
  transfer: 0,
});

async function loadTemplates() {
  return await api.templates.getTemplates() as unknown as {
    templates: ImportTemplate[];
  };
}
let predictionReviewFailed = $state(false);
let predictionRows = $state<
  Array<{
    rowIndex: number;
    confidence: Confidence;
    possibleTransfer: boolean;
    resolved: boolean;
    results: PredictionResult[];
  }>
>([]);

let templateItems = $derived(
  templates.map((t) => ({
    value: t,
    label: t.name,
    template_type: t.template_type,
  })),
);

let selectedTemplateOption = $derived(
  selectedTemplate
    ? {
      value: selectedTemplate,
      label: selectedTemplate.name,
      template_type: selectedTemplate.template_type,
    }
    : null,
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
  errors: [],
});

let previewEditorDom: Element | undefined = $state();
let previewEditor: EditorView | undefined = $state();
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
    api.account.getTfIdf(),
    api.prediction.getPredictionHistory(),
  ]);
  accountTfIdf.set(tfidf as unknown as AccountTfIdf);
  predictionSession.loadHistory(
    (historyResponse.history ?? []) as unknown as PredictionHistoryEntry[],
  );
  ({ templates } = await loadTemplates());
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
    },
  };
}

let saveAsNameDuplicate = $derived(
  !!find(templates, { name: saveAsName, template_type: "custom" }),
);
let selectedTemplateIsBuiltin = $derived(
  selectedTemplate?.template_type == "builtin",
);

async function handleSaveTemplate(name: string, content: string) {
  const { template, saved, message } = await api.templates.upsertTemplate({
    name,
    content,
  }) as unknown as {
    template: ImportTemplate;
    saved: boolean;
    message?: string;
  };
  if (!saved) {
    toast.toast({
      message: `Failed to save template ${name}. reason: ${message}`,
      type: "is-danger",
      duration: 10000,
    });
    return;
  }
  toast.toast({
    message: `Saved ${name}`,
    type: "is-success",
  });
  $templateEditorState = assign({}, $templateEditorState, {
    hasUnsavedChanges: false,
  });
  ({ templates } = await loadTemplates());
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
  const confirmed = confirm(
    `Are you sure you want to delete ${oldName} template?`,
  );
  if (!confirmed) {
    return;
  }
  const { success, message } = await api.templates.deleteTemplate({
    name: templateToDelete.name,
  });
  if (!success) {
    toast.toast({
      message: `Failed to remove ${oldName}. reason: ${message}`,
      type: "is-danger",
      duration: 10000,
    });
    return;
  }

  ({ templates } = await loadTemplates());
  if (templates.length > 0) {
    onSelectTemplate(templates[0]);
  }
  toast.toast({
    message: `Removed ${oldName}`,
    type: "is-success",
  });

  $templateEditorState = assign({}, $templateEditorState, {
    hasUnsavedChanges: false,
  });
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
        trim: currentTrim,
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
    predictionCounts = {
      high: 0,
      medium: 0,
      review: 0,
      unknown: 0,
      transfer: 0,
    };
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
      const match = templates.find((t) =>
        fileName.toLowerCase().includes(t.name.toLowerCase())
      );
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

function selectSourceRow(rowIndex: number, invocationIndex = 0) {
  selectedSourceRowIndex = rowIndex;
  selectedInvocationIndex = invocationIndex;
  if (typeof window !== "undefined" && window.innerWidth <= 860) {
    mobileInspectorOpen = true;
  }
  const renderedRow = find(renderMetadata.rows, { sourceRowIndex: rowIndex });
  if (!renderedRow?.lineRange || !previewEditor) {
    return;
  }

  const totalLines = previewEditor.state.doc.lines;
  const fromLine = Math.min(
    Math.max(1, renderedRow.lineRange.from),
    totalLines,
  );
  const toLine = Math.min(
    Math.max(fromLine, renderedRow.lineRange.to),
    totalLines,
  );

  try {
    const lineStart = previewEditor.state.doc.line(fromLine);
    const lineEnd = previewEditor.state.doc.line(toLine);
    previewEditor.dispatch({
      selection: { anchor: lineStart.from, head: lineEnd.to },
      effects: EditorView.scrollIntoView(lineStart.from, { y: "center" }),
    });
  } catch (err) {
    console.debug("Failed to scroll preview editor:", err);
  }
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

let selectedRowPredictions = $derived.by(() => {
  const _tick = predictionTick;
  if (selectedSourceRowIndex == null) return [];
  return summaryForRow(selectedSourceRowIndex)?.results || [];
});

let selectedPrediction = $derived.by(() => {
  const _tick = predictionTick;
  if (selectedRowPredictions.length === 0) return null;
  return (
    selectedRowPredictions.find(
      (r) => r.helperInvocationIndex === selectedInvocationIndex,
    ) ||
    selectedRowPredictions[0] ||
    null
  );
});

let reviewProgress = $derived.by(() => {
  const _tick = predictionTick;
  return predictionSession.reviewProgress();
});

let unresolvedQueue = $derived.by(() => {
  const _tick = predictionTick;
  return predictionSession.unresolvedPredictions();
});

let queuePosition = $derived.by(() => {
  const _tick = predictionTick;
  if (!selectedPrediction) return null;
  const idx = unresolvedQueue.findIndex(
    (r) =>
      r.rowIndex === selectedPrediction?.rowIndex &&
      r.helperInvocationIndex === selectedPrediction?.helperInvocationIndex &&
      r.prefix === selectedPrediction?.prefix,
  );
  if (idx === -1) return null;
  return {
    index: idx + 1,
    total: unresolvedQueue.length,
  };
});

let similarCount = $derived.by(() => {
  const _tick = predictionTick;
  if (!selectedPrediction || selectedPrediction.rowIndex == null) return 0;
  return predictionSession.similarPredictionsCount(
    selectedPrediction.rowIndex,
    selectedPrediction.prefix,
    selectedPrediction.helperInvocationIndex,
  );
});

let selectedInput = $derived.by(() => {
  const _tick = predictionTick;
  if (!selectedPrediction || selectedPrediction.rowIndex == null) return null;
  return predictionSession.getInput(
    selectedPrediction.rowIndex,
    selectedPrediction.helperInvocationIndex,
    selectedPrediction.prefix,
  );
});

let selectedReviewState = $derived.by(() => {
  const _tick = predictionTick;
  if (!selectedPrediction || selectedPrediction.rowIndex == null) return null;
  return predictionSession.getReviewState(
    selectedPrediction.rowIndex,
    selectedPrediction.helperInvocationIndex,
    selectedPrediction.prefix,
  );
});

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
  const { appliedCount } = predictionSession.applyToSimilar(
    selectedSourceRowIndex,
    selectedPrediction.prefix,
    account,
    selectedPrediction.helperInvocationIndex,
  );
  predictionTick += 1;
  toast.toast({
    message: `Applied account to ${appliedCount} similar ${
      appliedCount === 1 ? "transaction" : "transactions"
    }`,
    type: "is-info",
    duration: 3000,
  });

  const next = predictionSession.nextUnresolved();
  if (next && next.rowIndex != null) {
    selectSourceRow(next.rowIndex, next.helperInvocationIndex);
  } else {
    selectedSourceRowIndex = null;
    mobileInspectorOpen = false;
  }
}

async function alwaysUseMerchant(account: string) {
  if (!selectedPrediction || selectedSourceRowIndex == null) return;
  const merchant = selectedPrediction.merchantKey ||
    selectedInput?.description || "";
  if (!merchant) return;

  predictionSession.alwaysUseMerchant(
    merchant,
    selectedPrediction.prefix,
    account,
  );
  predictionSession.confirmPrediction(
    selectedSourceRowIndex,
    selectedPrediction.prefix,
    account,
    selectedPrediction.helperInvocationIndex,
  );
  predictionTick += 1;

  try {
    const res = await api.prediction.upsertMerchantRule({
      merchant,
      account,
      prefix: selectedPrediction.prefix,
    });
    if (res.saved) {
      toast.toast({
        message:
          `Persistent rule saved: <b>${merchant}</b> &rarr; <b>${account}</b>`,
        type: "is-success",
        duration: 4000,
      });
    } else if (res.message) {
      toast.toast({
        message: `Rule applied (${res.message})`,
        type: "is-warning",
        duration: 3000,
      });
    }
  } catch (error) {
    console.error("Failed to save merchant rule:", error);
    toast.toast({
      message: `Failed to save rule: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      type: "is-danger",
      duration: 5000,
    });
  }

  const next = predictionSession.nextUnresolved();
  if (next && next.rowIndex != null) {
    selectSourceRow(next.rowIndex, next.helperInvocationIndex);
  } else {
    selectedSourceRowIndex = null;
    mobileInspectorOpen = false;
  }
}

function confirmNextReview() {
  if (selectedSourceRowIndex == null || !selectedPrediction) {
    const next = predictionSession.nextUnresolved();
    if (next && next.rowIndex != null) {
      selectSourceRow(next.rowIndex, next.helperInvocationIndex);
    }
    return;
  }

  predictionSession.confirmPrediction(
    selectedSourceRowIndex,
    selectedPrediction.prefix,
    selectedPrediction.account,
    selectedPrediction.helperInvocationIndex,
  );
  predictionTick += 1;

  const next = predictionSession.nextUnresolved(
    selectedSourceRowIndex,
    selectedPrediction.helperInvocationIndex,
    selectedPrediction.prefix,
  );

  if (next && next.rowIndex != null) {
    selectSourceRow(next.rowIndex, next.helperInvocationIndex);
  } else {
    selectedSourceRowIndex = null;
    mobileInspectorOpen = false;
    toast.toast({
      message: "All transactions reviewed!",
      type: "is-success",
      duration: 3000,
    });
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
    hasUnsavedChanges: false,
  });
}

function openSaveModal() {
  if (isEmpty(preview)) return;
  const unresolvedRows = predictionSession.unresolvedRows();
  if (unresolvedRows.length > 0) {
    showReviewWarningModal = true;
  } else {
    showFileModal = true;
  }
}

async function saveToFile(destinationFile: string) {
  const finalName = ensureFileExtension(destinationFile, ".ledger");
  const { saved, message } = await api.editor.saveEditorFile({
    name: finalName,
    content: preview,
    operation: "overwrite",
  });

  if (saved) {
    toast.toast({
      message: `Saved <b><a href="/ledger/editor/${
        encodeURIComponent(finalName)
      }">${finalName}</a></b>`,
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
      duration: 3000,
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
  <div
    class="box-border flex h-full max-h-full min-h-0 w-full flex-col gap-[var(--paisa-space-2)] overflow-hidden">
    <!-- PAISA CLEAN TOP BAR -->
    <header class="flex shrink-0 flex-col rounded-[var(--paisa-radius-md)] border border-border bg-surface p-2.5 px-3.5 shadow-[var(--paisa-shadow-sm)]">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- LEFT: Page Title & Statement File Pill -->
        <div class="flex min-w-0 items-center gap-3">
          <h1 class="m-0 text-base font-bold tracking-tight text-foreground">Ledger Import</h1>

          {#if activeFileName}
            <span class="text-[var(--paisa-border-strong)] select-none font-light">/</span>

            <!-- Sleek File Pill -->
            <div class="inline-flex items-center gap-2 rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface-raised px-2.5 py-1 text-xs">
              <i class="{activeFileMeta.icon} {activeFileMeta.color} text-xs"></i>
              <span class="max-w-[200px] truncate font-semibold text-foreground" title={activeFileName}>
                {activeFileName}
              </span>
              <span class="rounded bg-primary-subtle px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary tabular-nums">
                {data.length} rows
              </span>
              <button
                type="button"
                class="cursor-pointer text-muted-foreground transition-colors hover:text-foreground p-0.5 border-0 bg-transparent"
                onclick={clearLoadedFile}
                title="Replace statement with another file"
                aria-label="Replace File"
              >
                <i class="fas fa-arrow-rotate-right text-[10px]"></i>
              </button>
            </div>
          {/if}
        </div>

        <!-- RIGHT: Clean Toolbar Controls -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Template Selector -->
          <div class="w-[180px] sm:w-[220px] flex items-center">
            <Select
              class="paisa-select-sm"
              items={templateItems}
              value={selectedTemplateOption}
              placeholder="Select Template…"
              showChevron={true}
              searchable={true}
              clearable={false}
              listAutoWidth={false}
              --list-max-height="300px"
              --list-z-index="50"
              on:change={(e) => {
                if (e.detail?.value) onSelectTemplate(e.detail.value);
              }}
            >
              <!-- Selected item inside input -->
              <div slot="selection" let:selection class="flex items-center gap-2 overflow-hidden text-xs font-semibold text-foreground">
                <i class="fas fa-file-code text-primary text-xs shrink-0"></i>
                <span class="truncate" title={selection.label}>{selection.label}</span>
              </div>

              <!-- Dropdown items -->
              <div slot="item" let:item class="flex w-full items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <i class="fas {item.template_type === 'builtin' ? 'fa-box-archive text-muted-foreground' : 'fa-file-code text-primary'} text-xs shrink-0"></i>
                  <span class="truncate font-medium text-xs text-foreground" title={item.label}>
                    {item.label}
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  {#if item.template_type === 'builtin'}
                    <span class="rounded px-1.5 py-0.5 text-[0.625rem] font-medium bg-surface-raised text-muted-foreground border border-border-subtle">
                      Built-in
                    </span>
                  {/if}
                  {#if selectedTemplate?.name === item.label}
                    <i class="fas fa-check text-primary text-xs"></i>
                  {/if}
                </div>
              </div>
            </Select>
          </div>

          <!-- Edit Template Button -->
          <Button
            variant="outline"
            size="sm"
            title="Edit active Handlebars template"
            ariaLabel="Edit Template"
            onclick={() => (templateDrawerOpen = true)}
          >
            {#snippet icon()}
              <i class="fas fa-code text-xs"></i>
            {/snippet}
            <span>Edit Template</span>
            {#if $templateEditorState.hasUnsavedChanges}
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-warning"></span>
            {/if}
          </Button>

          <!-- New Template Button -->
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

          <!-- Advanced Options Button -->
          <Button
            variant={advancedOptionsOpen ? "secondary" : "outline"}
            size="sm"
            title="Toggle import sequence and formatting options"
            ariaLabel="Advanced Options"
            onclick={() => (advancedOptionsOpen = !advancedOptionsOpen)}
          >
            {#snippet icon()}
              <i class="fas fa-sliders text-xs"></i>
            {/snippet}
            <span>Options</span>
            {#if options.reverse || options.trim}
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
            {/if}
            <i class="fas {advancedOptionsOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] ml-0.5 text-muted-foreground"></i>
          </Button>
        </div>
      </div>

      {#if advancedOptionsOpen}
        <div class="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-2.5">
          <div class="flex items-center gap-5">
            <Switch id="import-reverse" bind:checked={options.reverse} size="sm" label="Reverse Row Order" />
            <Switch id="trim-reverse" bind:checked={options.trim} size="sm" label="Trim Whitespace" />
          </div>
          <span class="text-[0.6875rem] text-muted-foreground flex items-center gap-1">
            <i class="fas fa-circle-info text-[10px]"></i>
            Adjust row sequence or clean generated ledger spacing
          </span>
        </div>
      {/if}
    </header>

    {#if isEmpty(data) && !loading}
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[var(--paisa-radius-md)] border border-border bg-surface p-[var(--paisa-space-6)]">
        <div class="w-full max-w-[540px] [&_.paisa-file-dropzone]:w-full [&_.paisa-file-dropzone]:cursor-pointer [&_.paisa-file-dropzone]:rounded-[var(--paisa-radius-md)] [&_.paisa-file-dropzone]:border-2 [&_.paisa-file-dropzone]:border-dashed [&_.paisa-file-dropzone]:border-border [&_.paisa-file-dropzone]:bg-canvas [&_.paisa-file-dropzone]:transition-all [&_.paisa-file-dropzone]:duration-[var(--paisa-transition-fast)] hover:[&_.paisa-file-dropzone]:border-[var(--paisa-primary)] hover:[&_.paisa-file-dropzone]:bg-primary-subtle">
          <FileDropzone
            multiple={false}
            accept=".csv,.txt,.xls,.xlsx,.pdf,.CSV,.TXT,.XLS,.XLSX,.PDF"
            on:drop={handleFilesSelect}
          >
            <div class="flex flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-center">
              <div class="mb-[var(--paisa-space-3)] flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <i class="fas fa-cloud-arrow-up fa-2x"></i>
              </div>
              <h2 class="mb-2 text-xl font-semibold text-foreground">Drop your bank or card statement here</h2>
              <p class="mb-4 text-base text-muted-foreground">Turn your financial statements into clean, verified ledger transactions</p>
              <div class="mb-4 flex flex-wrap items-center justify-center gap-1.5">
                <span class="rounded-[var(--paisa-radius-full)] border border-border-subtle bg-surface-raised px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">CSV</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-border-subtle bg-surface-raised px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">TXT</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-border-subtle bg-surface-raised px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">XLS / XLSX</span>
                <span class="rounded-[var(--paisa-radius-full)] border border-border-subtle bg-surface-raised px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">PDF</span>
              </div>
              <div class="inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-primary)] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110">
                <i class="fas fa-folder-open text-xs"></i>
                <span>Choose File</span>
              </div>
            </div>
          </FileDropzone>
        </div>

        {#if parseErrorMessage}
          <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-negative)]/20 bg-negative-subtle p-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-negative"></i>
              <div class="text-xs"><strong>Failed to parse document:</strong> {parseErrorMessage}</div>
            </div>
          </div>
        {/if}
      </div>
    {:else if loading}
      <div class="flex flex-1 flex-col items-center justify-center px-[var(--paisa-space-4)] py-[var(--paisa-space-6)] text-foreground">
        <i class="fas fa-spinner fa-pulse fa-2x text-primary"></i>
        <p class="mt-2 text-base font-semibold">Parsing Spreadsheet Data…</p>
        <p class="text-xs text-muted-foreground">Extracting tabular rows and columns</p>
      </div>
    {:else}
      <div class="hidden shrink-0 grid-cols-2 gap-2 max-[860px]:grid">
        <button
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border px-3 py-2 text-[0.8125rem] font-semibold transition-colors {mobileActiveTab === 'source' ? 'border-[var(--paisa-primary)] bg-primary text-white' : 'border-border bg-surface text-muted-foreground'}"
          onclick={() => (mobileActiveTab = "source")}
        >
          <i class="fas fa-table-cells text-xs"></i>
          <span>Source Data</span>
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--paisa-radius-sm)] border px-3 py-2 text-[0.8125rem] font-semibold transition-colors {mobileActiveTab === 'preview' ? 'border-[var(--paisa-primary)] bg-primary text-white' : 'border-border bg-surface text-muted-foreground'}"
          onclick={() => (mobileActiveTab = "preview")}
        >
          <i class="fas fa-file-invoice-dollar text-xs"></i>
          <span>Ledger Preview</span>
          {#if renderMetadata.generatedCount > 0}
            <span class="rounded-[var(--paisa-radius-full)] bg-white/25 px-1.5 py-0.5 text-[0.6875rem]">{renderMetadata.generatedCount}</span>
          {/if}
        </button>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-[minmax(430px,44%)_1fr] gap-[var(--paisa-space-2)] overflow-hidden max-[860px]:grid-cols-1">
        <div class="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-border bg-surface shadow-[var(--paisa-shadow-sm)] {mobileActiveTab === 'preview' ? 'max-[860px]:hidden' : ''}">
          <div class="flex min-h-10 shrink-0 items-center justify-between gap-[var(--paisa-space-2)] border-b border-border-subtle bg-surface-raised px-3 py-1.5">
            <div class="inline-flex shrink-0 gap-0.5 rounded-[var(--paisa-radius-sm)] border border-border bg-surface p-0.5">
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-sm)-2px)] border-0 px-2.5 py-1 text-[0.6875rem] font-medium transition-all {sourceViewMode === 'review' ? 'bg-primary font-semibold text-white' : 'bg-transparent text-muted-foreground hover:text-foreground'}"
                onclick={() => (sourceViewMode = "review")}
              >
                <i class="fas fa-list-check text-xs"></i>
                <span>Review</span>
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-sm)-2px)] border-0 px-2.5 py-1 text-[0.6875rem] font-medium transition-all {sourceViewMode === 'raw' ? 'bg-primary font-semibold text-white' : 'bg-transparent text-muted-foreground hover:text-foreground'}"
                onclick={() => (sourceViewMode = "raw")}
              >
                <i class="fas fa-table text-xs"></i>
                <span>Raw Data</span>
              </button>
            </div>

            {#if sourceViewMode === "raw"}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <span class="font-medium">{data.length} rows</span>
                {#if columnCount > 0}
                  <span class="text-[var(--paisa-border-strong)]">·</span>
                  <span class="font-mono text-[0.6875rem] text-muted-foreground">{columnCount} cols (A–{String.fromCharCode(64 + Math.min(columnCount, 26))})</span>
                {/if}
              </div>
            {/if}
          </div>

          {#if sourceViewMode === "review" && !predictionReviewFailed && (predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown) > 0}
            <div class="shrink-0 border-b border-border-subtle bg-surface px-3 py-2">
              <PredictionReviewBar
                counts={predictionCounts}
                filter={predictionFilter}
                progress={reviewProgress}
                onFilter={(next) => (predictionFilter = next)}
                onReviewNext={confirmNextReview}
              />
            </div>
          {/if}

          {#if parseErrorMessage}
            <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-negative)]/20 bg-negative-subtle p-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-triangle-exclamation text-negative"></i>
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
                onClearFilter={() => (predictionFilter = null)}
              />
            {:else}
              <div class="h-full min-h-0 flex-1 overflow-auto bg-[var(--paisa-table-bg)]">
                <table class="m-0 w-full min-w-full border-separate border-spacing-0 text-xs">
                  <thead>
                    <tr>
                      <th class="sticky left-0 top-0 z-[15] min-w-[110px] w-[110px] border-b border-r border-[var(--paisa-table-border)] bg-[var(--paisa-table-header-bg)] px-2.5 py-2 text-left font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--paisa-table-header-text)] select-none">
                        # · Status
                      </th>
                      {#each range(0, columnCount) as ci}
                        <th class="sticky top-0 z-10 min-w-[130px] border-b border-r border-[var(--paisa-table-border)] bg-[var(--paisa-table-header-bg)] px-3 py-1.5 text-left select-none">
                          <div class="flex items-center justify-between gap-2">
                            <span class="text-xs font-bold text-[var(--paisa-table-header-text)] tracking-wide">
                              {String.fromCharCode(65 + ci)}
                            </span>
                            <span class="rounded bg-[var(--paisa-table-bg)] px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-primary border border-[var(--paisa-table-border)]" title="Template variable: row.{String.fromCharCode(65 + ci)}">
                              row.{String.fromCharCode(65 + ci)}
                            </span>
                          </div>
                        </th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each data as row, ri}
                      <tr
                        class="group cursor-pointer transition-colors duration-75 {!rowIsVisible(ri) ? 'hidden' : ''} {selectedSourceRowIndex === ri ? '[&>th]:!bg-[var(--paisa-table-row-selected)] [&>td]:!bg-[var(--paisa-table-row-selected)]' : 'hover:[&>th]:bg-[var(--paisa-table-row-hover)] hover:[&>td]:bg-[var(--paisa-table-row-hover)]'}"
                        onclick={() => selectSourceRow(ri)}
                      >
                        <th class="paisa-sheet-row-header sticky left-0 z-[5] min-w-[110px] w-[110px] border-b border-r border-[var(--paisa-table-border)] bg-[var(--paisa-table-bg)] px-2.5 py-1.5 font-normal text-left select-none transition-colors {selectedSourceRowIndex === ri ? '!bg-[var(--paisa-table-row-selected)] border-l-2 border-l-[var(--paisa-primary)]' : ''}">
                          <div class="flex items-center justify-between gap-2">
                            <span class="font-mono text-xs font-semibold tabular-nums text-muted-foreground group-hover:text-foreground">
                              {ri}
                            </span>
                            <div class="shrink-0">
                              <PredictionRowBadge
                                confidence={predictionReviewFailed ? null : summaryForRow(ri)?.confidence}
                                possibleTransfer={predictionReviewFailed ? false : summaryForRow(ri)?.possibleTransfer}
                                resolved={predictionReviewFailed ? false : summaryForRow(ri)?.resolved}
                              />
                            </div>
                          </div>
                        </th>
                        {#each row as cell}
                          <td class="paisa-sheet-data-cell max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-r border-[var(--paisa-table-border)] bg-[var(--paisa-table-bg)] px-3 py-1.5 font-mono text-[0.75rem] text-foreground transition-colors {selectedSourceRowIndex === ri ? '!bg-[var(--paisa-table-row-selected)]' : ''}" title={displayCell(cell)}>
                            {#if displayCell(cell)}
                              {displayCell(cell)}
                            {:else}
                              <span class="text-muted-foreground/30 select-none font-sans italic">—</span>
                            {/if}
                          </td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>

          {#if !predictionReviewFailed && selectedPrediction}
            <div class="max-h-[360px] min-h-[220px] shrink-0 overflow-y-auto border-t border-border bg-surface max-[860px]:hidden">
              <PredictionDetail
                result={selectedPrediction}
                input={selectedInput}
                accounts={predictionSession.index?.accounts || []}
                queueIndex={queuePosition?.index}
                queueTotal={queuePosition?.total}
                similarCount={similarCount}
                rowPredictions={selectedRowPredictions}
                onSelectPrediction={(p) => (selectedInvocationIndex = p.helperInvocationIndex)}
                reviewStatus={selectedReviewState?.status}
                onOverride={overrideSelected}
                onApplySimilar={applySimilar}
                onAlwaysUse={alwaysUseMerchant}
                onConfirmNext={confirmNextReview}
                onClose={() => (selectedSourceRowIndex = null)}
              />
            </div>
          {/if}
        </div>

        <div class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-border bg-surface shadow-[var(--paisa-shadow-sm)] {mobileActiveTab === 'source' ? 'max-[860px]:hidden' : ''}">
          <div class="flex min-h-10 shrink-0 items-center justify-between gap-[var(--paisa-space-2)] border-b border-border-subtle bg-surface-raised px-2.5 py-1">
            <div class="flex min-w-0 items-center gap-[var(--paisa-space-2)] text-xs font-semibold uppercase tracking-wide text-foreground">
              <i class="fas fa-file-invoice-dollar text-xs text-positive"></i>
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
            <div class="m-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-warning)]/20 bg-warning-subtle p-3">
              <div class="text-xs"><strong>Template Errors:</strong> {renderMetadata.errors.length} rows encountered template rendering issues. Check Handlebars syntax or column mappings.</div>
            </div>
          {/if}

          <div class="relative min-h-0 h-full flex-1 overflow-hidden bg-canvas">
            <div class="preview-editor h-full w-full [&_.cm-editor]:h-full [&_.cm-editor]:min-h-full [&_.cm-editor]:font-mono [&_.cm-editor]:text-[0.8125rem] [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto" use:initPreviewEditor></div>
            {#if isEmpty(preview) && isEmpty(data)}
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-[var(--paisa-space-4)] text-center text-xs text-muted-foreground">
                <i class="fas fa-arrow-left fa-2x mb-2 text-muted-foreground"></i>
                <p>Upload a statement to inspect generated journal transactions.</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-between gap-[var(--paisa-space-3)] rounded-[var(--paisa-radius-md)] border border-border bg-surface px-3 py-1 text-xs shadow-[var(--paisa-shadow-sm)]">
        <div class="flex min-w-0 items-center gap-[var(--paisa-space-3)] overflow-x-auto">
          {#if parseErrorMessage}
            <span class="text-negative"><i class="fas fa-circle-xmark mr-1"></i> Parse failed</span>
          {:else if loading}
            <span class="text-primary"><i class="fas fa-spinner fa-pulse mr-1"></i> Parsing source data…</span>
          {:else if renderMetadata.generatedCount > 0}
            <span class="text-positive"><i class="fas fa-circle-check mr-1"></i> {renderMetadata.generatedCount} generated</span>
            {#if renderMetadata.errors.length > 0}
              <span class="text-negative"><i class="fas fa-triangle-exclamation mr-1"></i> {renderMetadata.errors.length} errors</span>
            {/if}
            {#if predictionCounts.high + predictionCounts.medium + predictionCounts.review + predictionCounts.unknown > 0}
              <span class="flex items-center gap-2.5 text-[0.6875rem]">
                <span class="inline-flex items-center gap-1 text-muted-foreground" title="High confidence: {predictionCounts.high}"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-high)]"></span> {predictionCounts.high} High</span>
                <span class="inline-flex items-center gap-1 text-muted-foreground" title="Medium confidence: {predictionCounts.medium}"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-medium)]"></span> {predictionCounts.medium} Med</span>
                <span class="inline-flex items-center gap-1 text-muted-foreground" title="Needs review: {predictionCounts.review}"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-review)]"></span> {predictionCounts.review} Review</span>
                <span class="inline-flex items-center gap-1 text-muted-foreground" title="Unknown: {predictionCounts.unknown}"><span class="h-1.5 w-1.5 rounded-full bg-[var(--paisa-prediction-unknown)]"></span> {predictionCounts.unknown} Unknown</span>
              </span>
            {/if}
          {:else if activeFileName}
            <span class="text-muted-foreground"><i class="fas fa-circle-info mr-1"></i> No transactions generated</span>
          {:else}
            <span class="text-muted-foreground"><i class="fas fa-circle-info mr-1"></i> Import a file to begin</span>
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
<Drawer title="Selected Row Review" bind:open={mobileInspectorOpen}
  side="right">
  {#snippet children()}
    {#if selectedPrediction}
      <PredictionDetail
        result={selectedPrediction}
        input={selectedInput}
        accounts={predictionSession.index?.accounts || []}
        queueIndex={queuePosition?.index}
        queueTotal={queuePosition?.total}
        similarCount={similarCount}
        rowPredictions={selectedRowPredictions}
        onSelectPrediction={(p) => (selectedInvocationIndex = p.helperInvocationIndex)}
        reviewStatus={selectedReviewState?.status}
        onOverride={overrideSelected}
        onApplySimilar={applySimilar}
        onAlwaysUse={alwaysUseMerchant}
        onConfirmNext={confirmNextReview}
        onClose={() => (mobileInspectorOpen = false)}
      />
    {:else}
      <div class="p-4 text-center text-sm text-muted-foreground">
        Select a row from the Review or Raw Data list to inspect and override.
      </div>
    {/if}
  {/snippet}
</Drawer>

<!-- SAFE-SAVE WARNING DIALOG -->
<Dialog
  bind:open={showReviewWarningModal}
  title="Unreviewed Transactions"
  onclose={() => (showReviewWarningModal = false)}
>
  {#snippet children()}
    <div class="space-y-3 py-2 text-sm text-muted-foreground">
      <p>
        There {reviewProgress.remaining === 1 ? "is" : "are"}
        <strong class="font-semibold text-foreground">
          {reviewProgress.remaining} {reviewProgress.remaining === 1 ? "transaction" : "transactions"}
        </strong>
        that still require review (unresolved low-confidence or transfer predictions).
      </p>
      <p class="text-xs text-muted-foreground">
        You can return to review and categorize them, or proceed to save the ledger preview anyway.
      </p>
    </div>
  {/snippet}
  {#snippet footer({ close })}
    <div class="flex w-full items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="sm"
        onclick={() => {
          close();
          const next = predictionSession.nextUnresolved();
          if (next && next.rowIndex != null) {
            selectSourceRow(next.rowIndex, next.helperInvocationIndex);
            if (typeof window !== "undefined" && window.innerWidth <= 860) {
              mobileInspectorOpen = true;
            }
          }
        }}
      >
        <i class="fas fa-arrow-left mr-1.5 text-xs"></i>
        Back to Review
      </Button>
      <Button
        variant="primary"
        size="sm"
        onclick={() => {
          close();
          showFileModal = true;
        }}
      >
        Continue Saving
        <i class="fas fa-arrow-right ml-1.5 text-xs"></i>
      </Button>
    </div>
  {/snippet}
</Dialog>

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
          const { template, saved, message } = await api.templates.upsertTemplate({
            name: saveAsName,
            content: selectedTemplate?.content || "",
          }) as unknown as { template: ImportTemplate; saved: boolean; message?: string };
          if (saved) {
            ({ templates } = await loadTemplates());
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
