<script lang="ts">
  import { ajax, type LedgerFile, type Transaction as T } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import VirtualList from "svelte-tiny-virtual-list";
  import Transaction from "$lib/components/transactions/Transaction.svelte";
  import BulkEditForm from "$lib/components/ledger/BulkEditForm.svelte";
  import { slide } from "svelte/transition";
  import * as bulkEdit from "$lib/ledger/bulk_edit";
  import * as toast from "$lib/core/toast";
  import DiffViewModal from "$lib/components/ledger/DiffViewModal.svelte";
  import SearchQuery from "$lib/components/ledger/SearchQuery.svelte";
  import { editorState } from "$lib/editors/search_query_editor";
  import { get } from "svelte/store";
  import { download } from "$lib/importing/export";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";

  let bulkEditOpen = $state(false);
  let transactions: T[] = $state(null);
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
    return _.filter(t.postings, (p) => p.amount < 0);
  };

  const credits = (t: T) => {
    return _.filter(t.postings, (p) => p.amount >= 0);
  };

  function handleInputRaw(predicate: (t: T) => boolean) {
    if (!transactions) return;
    filtered = _.filter(transactions, predicate);
  }

  const handleInput = _.debounce(handleInputRaw, 100);

  const unsubscribe = editorState.subscribe((state) => {
    handleInput(state.predicate);
  });

  onDestroy(() => {
    unsubscribe();
  });

  const itemSize = (i: number) => {
    const t = filtered[i];
    if (!t) return 52;
    const count = isSmallScreen ? t.postings.length : Math.max(credits(t).length, debits(t).length, 1);
    return isSmallScreen ? 44 + count * 24 : Math.max(52, count * 26 + 18);
  };

  function updateDimensions() {
    if (typeof window !== "undefined") {
      isSmallScreen = window.innerWidth < 768;
      // Reserve space for top header (56px) + page header + toolbar + padding
      const offset = isSmallScreen ? (bulkEditOpen ? 420 : 250) : (bulkEditOpen ? 340 : 220);
      listHeight = Math.max(320, window.innerHeight - offset);
    }
  }

  async function loadTransactions() {
    ({ files, accounts, commodities } = await ajax("/api/editor/files"));
    ({ transactions } = await ajax("/api/transaction"));
    handleInputRaw(get(editorState).predicate);
    newFiles = files;
  }

  async function downloadTransactions() {
    const { balancedPostings } = await ajax("/api/transaction/balanced");
    download(balancedPostings);
  }

  function showPreview(detail: any) {
    ({ newFiles, updatedTransactionsCount } = bulkEdit.applyChanges(
      files,
      filtered,
      detail.operation,
      detail.args
    ));
    openPreviewModal = true;
  }

  async function saveAll(newFiles: LedgerFile[]) {
    for (const newFile of newFiles) {
      const { saved, message } = await ajax("/api/editor/save", {
        method: "POST",
        body: JSON.stringify({ name: newFile.name, content: newFile.content }),
        background: true
      });

      if (!saved) {
        toast.toast({
          message: `Failed to save ${newFile.name}. reason: ${message}`,
          type: "is-danger",
          duration: 10000
        });
      } else {
        toast.toast({
          message: `Saved ${newFile.name}`,
          type: "is-success"
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

<div class="paisa-transactions-view">
  <!-- Page Header -->
  <PageHeader
    title="Transactions"
    description="Journal transactions, search, and bulk edits"
  />

  <!-- Main Data Explorer Content Area -->
  <div class="paisa-tx-workspace">
    <!-- Toolbar with dominant query editor and actions -->
    <div class="paisa-tx-toolbar">
      <div class="paisa-tx-search-container">
        <SearchQuery
          autocomplete={{
            account: accounts,
            commodity: commodities,
            filename: files.map((f) => f.name)
          }}
        />
      </div>

      <div class="paisa-tx-actions-cluster">
        <div class="paisa-tx-count-pill">
          <p class="is-6 m-0 inline"><b>{filtered.length}</b> transaction(s)</p>
        </div>

        <div class="paisa-tx-btn-group">
          <button
            type="button"
            class="paisa-bulk-edit-toggle {bulkEditOpen ? 'is-active' : ''}"
            onclick={() => {
              bulkEditOpen = !bulkEditOpen;
              setTimeout(updateDimensions, 200);
            }}
          >
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Bulk Edit</span>
            <i class="fas {bulkEditOpen ? 'fa-angle-up' : 'fa-angle-down'}"></i>
          </button>

          <button
            type="button"
            class="paisa-export-btn"
            onclick={downloadTransactions}
            title="Download balanced transactions"
          >
            <i class="fa-solid fa-file-arrow-down"></i>
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Edit Slide-Over Form Panel -->
    {#if bulkEditOpen}
      <div class="paisa-bulk-edit-wrapper" transition:slide={{ duration: 180 }}>
        <BulkEditForm {accounts} on:preview={(e) => showPreview(e.detail)} />
      </div>
    {/if}

    <!-- Virtualized Transactions Data Table -->
    {#if transactions}
      <div class="paisa-tx-table-card">
        <!-- Table Column Headers (Desktop) -->
        <div class="paisa-table-header-row hidden md:grid">
          <div class="paisa-th-col">Date & Payee</div>
          <div class="paisa-th-col">Debits</div>
          <div class="paisa-th-col">Credits</div>
        </div>

        <!-- Virtualized Row List -->
        {#if filtered.length > 0}
          <div class="paisa-virtual-list-wrap">
            <VirtualList
              width="100%"
              height={listHeight}
              itemCount={filtered.length}
              {itemSize}
            >
              <svelte:fragment slot="item" let:index let:style>
                {@const t = filtered[index]}
                <div {style} class="paisa-virtual-row-slot">
                  <Transaction {t} />
                </div>
              </svelte:fragment>
            </VirtualList>
          </div>
        {:else}
          <div class="paisa-tx-empty-state">
            <div class="paisa-empty-icon">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <div class="paisa-empty-title">No transactions match your search</div>
            <div class="paisa-empty-desc">
              Try adjusting your query terms, account filters, or date range.
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="paisa-tx-loading-card">
        <div class="paisa-tx-loading-spinner"></div>
        <span>Loading transactions...</span>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .paisa-transactions-view {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .paisa-tx-workspace {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    min-width: 0;
  }

  .paisa-tx-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.875rem;
    flex-wrap: wrap;
    width: 100%;
  }

  .paisa-tx-search-container {
    flex: 1 1 320px;
    min-width: 0;
    max-width: 100%;
  }

  .paisa-tx-actions-cluster {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .paisa-tx-count-pill {
    font-size: 0.8125rem;
    color: var(--paisa-muted-foreground);
    padding: 0.375rem 0.625rem;
    background-color: var(--paisa-surface-raised);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md, 0.375rem);
    white-space: nowrap;

    b {
      color: var(--paisa-foreground);
    }
  }

  .paisa-tx-btn-group {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .paisa-bulk-edit-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.25rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--paisa-foreground);
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    cursor: pointer;
    transition: background-color var(--paisa-transition-fast), border-color var(--paisa-transition-fast), color var(--paisa-transition-fast);
    white-space: nowrap;

    &:hover {
      background-color: var(--paisa-surface-hover);
      border-color: var(--paisa-border-strong);
    }

    &.is-active {
      background-color: var(--paisa-primary-subtle);
      border-color: var(--paisa-primary);
      color: var(--paisa-primary);
      font-weight: 600;
    }
  }

  .paisa-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    height: 2.25rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--paisa-foreground);
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-md, 0.375rem);
    cursor: pointer;
    transition: background-color var(--paisa-transition-fast), border-color var(--paisa-transition-fast);
    white-space: nowrap;

    &:hover {
      background-color: var(--paisa-surface-hover);
      border-color: var(--paisa-border-strong);
    }
  }

  .paisa-bulk-edit-wrapper {
    width: 100%;
  }

  .paisa-tx-table-card {
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-lg, 0.5rem);
    overflow: hidden;
    box-shadow: var(--paisa-shadow-sm);
    display: flex;
    flex-direction: column;
    width: 100%;
    min-width: 0;
  }

  .paisa-table-header-row {
    display: none;

    @media (min-width: 768px) {
      display: grid;
      grid-template-columns: 200px 1fr 1fr;
      gap: 1rem;
      padding: 0.625rem 0.75rem;
      background-color: var(--paisa-surface-raised);
      border-bottom: 1px solid var(--paisa-border);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--paisa-muted-foreground);
    }
  }

  .paisa-th-col {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .paisa-virtual-list-wrap {
    width: 100%;
    overflow-x: hidden;
  }

  .paisa-virtual-row-slot {
    width: 100%;
    box-sizing: border-box;
  }

  .paisa-tx-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1.5rem;
    text-align: center;
  }

  .paisa-empty-icon {
    width: 3rem;
    height: 3rem;
    border-radius: var(--paisa-radius-full, 9999px);
    background-color: var(--paisa-surface-raised);
    color: var(--paisa-muted-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .paisa-empty-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--paisa-foreground);
    margin-bottom: 0.25rem;
  }

  .paisa-empty-desc {
    font-size: 0.8125rem;
    color: var(--paisa-muted-foreground);
    max-width: 360px;
  }

  .paisa-tx-loading-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 4rem 1.5rem;
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border);
    border-radius: var(--paisa-radius-lg, 0.5rem);
    color: var(--paisa-muted-foreground);
    font-size: 0.875rem;
  }

  .paisa-tx-loading-spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--paisa-border-strong);
    border-top-color: var(--paisa-primary);
    border-radius: 50%;
    animation: paisa-spin 0.6s linear infinite;
  }

  @keyframes paisa-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 767px) {
    .paisa-tx-toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.625rem;
    }

    .paisa-tx-search-container {
      flex: 0 0 auto;
      width: 100%;
      min-width: 0;
    }

    .paisa-tx-actions-cluster {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
      width: 100%;
    }

    .paisa-tx-count-pill {
      font-size: 0.75rem;
      color: var(--paisa-muted-foreground);
      padding: 0;
      background: transparent;
      border: none;
    }

    .paisa-tx-btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      width: 100%;
    }

    .paisa-bulk-edit-toggle,
    .paisa-export-btn {
      min-height: 2.75rem;
      justify-content: center;
      width: 100%;
    }
  }
</style>
