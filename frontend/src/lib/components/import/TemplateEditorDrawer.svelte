<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import type { EditorView } from "@codemirror/view";
  import {
    createEditor,
    editorState as templateEditorState,
    updateContent,
  } from "$lib/editors/template_editor";
  import type { ImportTemplate } from "$lib/core/utils";
  import Button from "$lib/components/ui/Button.svelte";
  import IconButton from "$lib/components/ui/IconButton.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import FormField from "$lib/components/layout/FormField.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import _ from "lodash";

  interface Props {
    open?: boolean;
    selectedTemplate?: ImportTemplate;
    templates?: ImportTemplate[];
    columns?: string[];
    onsave?: (name: string, content: string) => Promise<void>;
    ondelete?: (template: ImportTemplate) => Promise<void>;
  }

  let {
    open = $bindable(false),
    selectedTemplate,
    templates = [],
    columns = [],
    onsave,
    ondelete,
  }: Props = $props();

  let editorView = $state<EditorView | null>(null);
  let showCheatsheet = $state(false);
  let showSaveAsModal = $state(false);
  let saveAsName = $state("");

  const isBuiltin = $derived(selectedTemplate?.template_type === "builtin");
  const hasUnsavedChanges = $derived($templateEditorState.hasUnsavedChanges);
  const saveAsNameDuplicate = $derived(
    Boolean(_.find(templates, { name: saveAsName, template_type: "custom" })),
  );

  function initCodeMirror(node: HTMLElement, template?: ImportTemplate) {
    const editor = createEditor(template?.content || selectedTemplate?.content || "", node);
    editorView = editor;

    return {
      update(newTemplate?: ImportTemplate) {
        if (editor && newTemplate) {
          const currentDoc = editor.state.doc.toString();
          if (currentDoc !== newTemplate.content && !hasUnsavedChanges) {
            updateContent(editor, newTemplate.content);
          }
        }
      },
      destroy() {
        editor?.destroy?.();
        editorView = null;
      },
    };
  }

  function getEditorContent(): string {
    return editorView ? editorView.state.doc.toString() : (selectedTemplate?.content || "");
  }

  async function handleDirectSave() {
    if (!selectedTemplate) return;
    if (isBuiltin) {
      saveAsName = `${selectedTemplate.name} (Custom)`;
      showSaveAsModal = true;
      return;
    }
    const content = getEditorContent();
    await onsave?.(selectedTemplate.name, content);
  }

  function handleOpenSaveAs() {
    saveAsName = selectedTemplate ? `${selectedTemplate.name} Copy` : "";
    showSaveAsModal = true;
  }

  async function handleConfirmSaveAs() {
    if (!saveAsName || saveAsNameDuplicate) return;
    const content = getEditorContent();
    showSaveAsModal = false;
    await onsave?.(saveAsName, content);
  }

  function copySnippet(snippet: string) {
    if (editorView) {
      const selection = editorView.state.selection.main;
      editorView.dispatch({
        changes: { from: selection.from, to: selection.to, insert: snippet },
        selection: { anchor: selection.from + snippet.length },
      });
      editorView.focus();
    }
  }

  $effect(() => {
    if (open && editorView && selectedTemplate) {
      const currentDoc = editorView.state.doc.toString();
      if (currentDoc !== selectedTemplate.content && !hasUnsavedChanges) {
        updateContent(editorView, selectedTemplate.content);
      }
      setTimeout(() => editorView?.focus?.(), 100);
    }
  });
</script>

<BitsDialog.Root bind:open>
  <BitsDialog.Portal>
    <BitsDialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200" />
    <BitsDialog.Content
      class="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] shadow-2xl transition-transform duration-200 max-sm:max-w-full"
      aria-label="Template Editor"
    >
      <!-- HEADER -->
      <div class="flex shrink-0 items-center justify-between border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-elevated)] px-4 py-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--paisa-primary)]/10 text-[var(--paisa-primary)]">
            <i class="fas fa-code text-sm"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="truncate text-sm font-bold text-[var(--paisa-foreground)]">
                {selectedTemplate?.name || "Template Editor"}
              </h2>
              <Badge variant={isBuiltin ? "info" : "primary"} size="sm">
                {selectedTemplate?.template_type || "Template"}
              </Badge>
              {#if hasUnsavedChanges}
                <Badge variant="warning" size="sm" dot>Unsaved</Badge>
              {/if}
            </div>
            <p class="text-[0.6875rem] text-[var(--paisa-muted-foreground)]">
              Handlebars-based ledger transaction mapping template
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-2.5 text-xs font-medium text-[var(--paisa-muted-foreground)] transition-colors hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-foreground)]"
            onclick={() => (showCheatsheet = !showCheatsheet)}
            title="Toggle Variables & Helpers Reference"
          >
            <i class="fas fa-book-bookmark text-[0.75rem]"></i>
            <span class="hidden sm:inline">{showCheatsheet ? "Hide Helpers" : "Helpers Reference"}</span>
          </button>
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Close Template Editor"
            onclick={() => (open = false)}
          >
            <i class="fas fa-xmark text-sm"></i>
          </IconButton>
        </div>
      </div>

      <!-- CHEATSHEET / HELPER PANEL -->
      {#if showCheatsheet}
        <div class="shrink-0 border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-elevated)] p-3 text-xs">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <!-- Available Columns -->
            <div class="rounded-lg border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] p-2.5">
              <span class="mb-1.5 block font-semibold text-[var(--paisa-foreground)]">
                <i class="fas fa-table-columns mr-1 text-[var(--paisa-primary)]"></i> Available Columns (Click to insert)
              </span>
              {#if columns && columns.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each columns as col}
                    <button
                      type="button"
                      class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                      onclick={() => copySnippet(`{{ROW.${col}}}`)}
                    >
                      {`{{ROW.${col}}}`}
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="text-[0.6875rem] text-[var(--paisa-muted-foreground)]">
                  Load a CSV/PDF/XLSX file on the import page to view live column names, or use default columns:
                  <span class="font-mono text-[var(--paisa-primary)]">{'{{ROW.A}}'}</span>,
                  <span class="font-mono text-[var(--paisa-primary)]">{'{{ROW.B}}'}</span>,
                  <span class="font-mono text-[var(--paisa-primary)]">{'{{ROW.C}}'}</span>.
                </p>
              {/if}
            </div>

            <!-- Common Helpers -->
            <div class="rounded-lg border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] p-2.5">
              <span class="mb-1.5 block font-semibold text-[var(--paisa-foreground)]">
                <i class="fas fa-wand-magic-sparkles mr-1 text-[var(--paisa-primary)]"></i> Template Functions
              </span>
              <div class="flex flex-wrap gap-1">
                <button
                  type="button"
                  class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                  title="Format date as YYYY/MM/DD"
                  onclick={() => copySnippet('{{date ROW.A "DD/MM/YYYY"}}')}
                >
                  date
                </button>
                <button
                  type="button"
                  class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                  title="Scrub & parse amount"
                  onclick={() => copySnippet('{{amount ROW.B}}')}
                >
                  amount
                </button>
                <button
                  type="button"
                  class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                  title="AI / TF-IDF account predictor"
                  onclick={() => copySnippet('{{predictAccount ROW.Description prefix="Expenses"}}')}
                >
                  predictAccount
                </button>
                <button
                  type="button"
                  class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                  title="Regex matcher"
                  onclick={() => copySnippet('{{regexpMatch ROW.A "UPI/(\\w+)" group=1}}')}
                >
                  regexpMatch
                </button>
                <button
                  type="button"
                  class="rounded bg-[var(--paisa-surface-hover)] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[var(--paisa-foreground)] hover:bg-[var(--paisa-primary)] hover:text-white"
                  title="Clean multiple whitespace"
                  onclick={() => copySnippet('{{oneline ROW.A}}')}
                >
                  oneline
                </button>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- CODEMIRROR EDITOR BODY -->
      <div class="relative min-h-0 flex-1 overflow-hidden bg-[var(--paisa-canvas-bg)]">
        <div
          class="h-full w-full [&_.cm-editor]:h-full [&_.cm-editor]:w-full [&_.cm-editor]:font-mono [&_.cm-editor]:text-xs [&_.cm-scroller]:h-full [&_.cm-scroller]:overflow-auto"
          use:initCodeMirror={selectedTemplate}
        ></div>
      </div>

      <!-- FOOTER ACTIONS -->
      <div class="flex shrink-0 items-center justify-between border-t border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-elevated)] px-4 py-3">
        <div class="flex items-center gap-2">
          {#if !isBuiltin && selectedTemplate}
            <Button
              variant="danger"
              size="sm"
              onclick={() => ondelete?.(selectedTemplate)}
              title="Delete this custom template"
            >
              {#snippet icon()}
                <i class="fas fa-trash-can text-xs"></i>
              {/snippet}
              Delete
            </Button>
          {/if}
          <Button
            variant="outline"
            size="sm"
            onclick={handleOpenSaveAs}
            title="Save as a new custom template"
          >
            {#snippet icon()}
              <i class="fas fa-copy text-xs"></i>
            {/snippet}
            Save As New
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" onclick={() => (open = false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!hasUnsavedChanges && !isBuiltin}
            title={hasUnsavedChanges
              ? isBuiltin
                ? "Builtin templates must be saved as custom templates"
                : "Save changes to this template"
              : "No changes to save"}
            onclick={handleDirectSave}
          >
            {#snippet icon()}
              <i class="fas {isBuiltin ? 'fa-code-fork' : 'fa-floppy-disk'} text-xs"></i>
            {/snippet}
            {isBuiltin ? "Save as Custom" : "Save Changes"}
          </Button>
        </div>
      </div>
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>

<!-- SAVE AS / CREATE TEMPLATE MODAL -->
<Dialog
  bind:open={showSaveAsModal}
  title={isBuiltin ? "Save as Custom Template" : "Save Template As"}
  description="Enter a unique name for this custom template"
  onclose={() => (showSaveAsModal = false)}
>
  {#snippet children()}
    <FormField
      id="template-save-name-input"
      label="Template Name"
      error={saveAsNameDuplicate ? "A custom template with this name already exists." : undefined}
    >
      {#snippet children()}
        <Input
          id="template-save-name-input"
          size="sm"
          bind:value={saveAsName}
          placeholder="e.g. My Bank Statement"
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
        onclick={handleConfirmSaveAs}
      >
        Save Template
      </Button>
    </div>
  {/snippet}
</Dialog>
