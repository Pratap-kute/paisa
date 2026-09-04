<script lang="ts">
import type { LedgerFile, Transaction as T } from "$lib/domain/ledger";
import { api } from "$lib/api";
import { debounce } from "es-toolkit";
import { onDestroy, onMount } from "svelte";
import VirtualList from "svelte-tiny-virtual-list";
import Transaction from "$lib/features/transactions/components/Transaction.svelte";
import BulkEditForm from "$lib/features/ledger/components/BulkEditForm.svelte";
import { slide } from "svelte/transition";
import * as bulkEdit from "$lib/features/ledger/bulk_edit";
import * as toast from "$lib/shared/ui/toast";
import DiffViewModal from "$lib/features/ledger/components/DiffViewModal.svelte";
import SearchQuery from "$lib/features/ledger/components/SearchQuery.svelte";
import { editorState } from "$lib/features/editor/search_query_editor";
import { get } from "svelte/store";
import { download } from "$lib/features/importing/export";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import { filter } from "$lib/shared/utils/collection";

let bulkEditOpen = $state(false);
let transactions: T[] | null = $state(null);
let filtered: T[] = $state([]);
let files: LedgerFile[] = $state([]);
let newFiles: LedgerFile[] = $state([]);
let updatedTransactionsCount = $state(0);
let openPreviewModal = $state(false);
let accounts: string[] = $state([]);
let commodities: string[] = $state([]);
let listHeight = $state(600);
let isSmallScreen = $state(false);

const debits = (t: T) => {
  return filter(t.postings, (p) => p.amount < 0);
};

const credits = (t: T) => {
  return filter(t.postings, (p) => p.amount >= 0);
};

function handleInputRaw(predicate: (t: T) => boolean) {
  if (!transactions) return;
  filtered = filter(transactions, predicate);
}

const handleInput = debounce(handleInputRaw, 100);

const unsubscribe = editorState.subscribe((state) => {
  handleInput(state.predicate);
});

onDestroy(() => {
  unsubscribe();
});

const itemSize = (i: number) => {
  const t = filtered[i];
  if (!t) return 52;
  const count = isSmallScreen
    ? t.postings.length
    : Math.max(credits(t).length, debits(t).length, 1);
  return isSmallScreen ? 44 + count * 24 : Math.max(52, count * 26 + 18);
};

function updateDimensions() {
  if (typeof window !== "undefined") {
    isSmallScreen = window.innerWidth < 768;
    const offset = isSmallScreen
      ? (bulkEditOpen ? 420 : 250)
      : (bulkEditOpen ? 340 : 220);
    listHeight = Math.max(320, window.innerHeight - offset);
  }
}

async function loadTransactions() {
  const editorRes = await api.editor.getEditorFiles();
  files = (editorRes.files as unknown as LedgerFile[]) || [];
  accounts = editorRes.accounts || [];
  commodities = editorRes.commodities || [];

  const txRes = await api.transaction.getTransactions();
  transactions = (txRes.transactions as unknown as T[]) || [];
  handleInputRaw(get(editorState).predicate);
  newFiles = files;
}

async function downloadTransactions() {
  const response = await api.transaction.getBalancedPostings();
  download(response.balancedPostings as unknown as any);
}

function showPreview(detail: any) {
  ({ newFiles, updatedTransactionsCount } = bulkEdit.applyChanges(
    files,
    filtered,
    detail.operation,
    detail.args,
  ));
  openPreviewModal = true;
}

async function saveAll(newFiles: LedgerFile[]) {
  for (const newFile of newFiles) {
    const res = await api.editor.saveEditorFile({
      name: newFile.name,
      content: newFile.content,
    });

    if (!res.saved) {
      toast.toast({
        message: `Failed to save ${newFile.name}. reason: ${
          res.message || "Unknown error"
        }`,
        type: "is-danger",
        duration: 10000,
      });
    } else {
      toast.toast({
        message: `Saved ${newFile.name}`,
        type: "is-success",
      });
    }
  }
  await loadTransactions();
}

onMount(() => {
  updateDimensions();
  window.addEventListener("resize", updateDimensions);
  loadTransactions();
  return () => {
    window.removeEventListener("resize", updateDimensions);
  };
});
</script>

<svelte:head>
  <title>Transactions — Paisa</title>
</svelte:head>

<DiffViewModal
  on:save={(e) => saveAll(e.detail)}
  bind:open={openPreviewModal}
  oldFiles={files}
  {newFiles}
  {updatedTransactionsCount}
/>

<div class="flex w-full min-w-0 max-w-full flex-col gap-5">
  <PageHeader
    title="Transactions"
    description="Journal transactions, search, and bulk edits"
  />

  <div class="flex w-full min-w-0 flex-col gap-4">
    <div class="flex w-full flex-wrap items-center justify-between gap-3.5 max-md:flex-col max-md:items-stretch max-md:gap-2.5">
      <div class="min-w-0 max-w-full flex-[1_1_320px] max-md:w-full max-md:flex-none">
        <SearchQuery
          autocomplete={{
            account: accounts,
            commodity: commodities,
            filename: files.map((f) => f.name)
          }}
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-2">
        <div class="whitespace-nowrap rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-[0.8125rem] text-muted-foreground max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-xs">
          <p class="m-0 inline"><b class="text-foreground">{filtered.length}</b> transaction(s)</p>
        </div>

        <div class="inline-flex items-center gap-2 max-md:grid max-md:w-full max-md:grid-cols-2">
          <button
            type="button"
            class="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--paisa-radius-md)] border px-3 text-[0.8125rem] font-medium transition-[background-color,border-color,color] duration-[var(--paisa-transition-fast)] max-md:min-h-11 max-md:w-full max-md:justify-center {bulkEditOpen ? 'border-[var(--paisa-primary)] bg-primary-subtle font-semibold text-primary' : 'border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-hover'}"
            onclick={() => {
              bulkEditOpen = !bulkEditOpen;
              setTimeout(updateDimensions, 200);
            }}
          >
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Bulk Edit</span>
            <i class="fas {bulkEditOpen ? 'fa-angle-up' : 'fa-angle-down'}"></i>
          </button>

          <Button
            variant="outline"
            size="sm"
            class="max-md:min-h-11 max-md:w-full max-md:justify-center"
            title="Download balanced transactions"
            onclick={downloadTransactions}
          >
            {#snippet icon()}
              <i class="fa-solid fa-file-arrow-down"></i>
            {/snippet}
            Download
          </Button>
        </div>
      </div>
    </div>

    {#if bulkEditOpen}
      <div class="w-full" transition:slide={{ duration: 180 }}>
        <BulkEditForm {accounts} on:preview={(e) => showPreview(e.detail)} />
      </div>
    {/if}

    {#if transactions}
      <div class="flex w-full min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-lg)] border border-border bg-surface shadow-[var(--paisa-shadow-sm)]">
        <div class="hidden grid-cols-[200px_1fr_1fr] gap-4 border-b border-border bg-surface-raised px-3 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
          <div class="truncate">Date & Payee</div>
          <div class="truncate">Debits</div>
          <div class="truncate">Credits</div>
        </div>

        {#if filtered.length > 0}
          <div class="w-full overflow-x-hidden">
            <VirtualList
              width="100%"
              height={listHeight}
              itemCount={filtered.length}
              {itemSize}
            >
              <svelte:fragment slot="item" let:index let:style>
                {@const t = filtered[index]}
                <div {style} class="box-border w-full">
                  <Transaction {t} />
                </div>
              </svelte:fragment>
            </VirtualList>
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-xl text-muted-foreground">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <div class="mb-1 text-[0.9375rem] font-semibold text-foreground">No transactions match your search</div>
            <div class="max-w-[360px] text-[0.8125rem] text-muted-foreground">
              Try adjusting your query terms, account filters, or date range.
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center gap-3 rounded-[var(--paisa-radius-lg)] border border-border bg-surface px-6 py-16 text-sm text-muted-foreground">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-[var(--paisa-primary)]"></div>
        <span>Loading transactions...</span>
      </div>
    {/if}
  </div>
</div>
