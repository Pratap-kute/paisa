<script lang="ts">
  import { ajax, isMobile, type LedgerFile, type Transaction as T } from "$lib/core/utils";
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
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let buldEditOpen = $state(false);
  let transactions: T[] = $state(null);
  let filtered: T[] = $state([]);
  let files: LedgerFile[] = $state([]);
  let newFiles: LedgerFile[] = $state([]);
  let updatedTransactionsCount = $state(0);
  let openPreviewModal = $state(false);
  let accounts: string[] = $state([]);
  let commodities: string[] = $state([]);

  const debits = (t: T) => {
    return _.filter(t.postings, (p) => p.amount < 0);
  };

  const credits = (t: T) => {
    return _.filter(t.postings, (p) => p.amount >= 0);
  };

  function handleInputRaw(predicate: (t: T) => boolean) {
    filtered = _.filter(transactions, predicate);
  }

  const handleInput = _.debounce(handleInputRaw, 100);

  const unsubscribe = editorState.subscribe((state) => {
    handleInput(state.predicate);
  });

  onDestroy(async () => {
    unsubscribe();
  });

  const mobile = isMobile();

  const itemSize = (i: number) => {
    const t = filtered[i];
    const count = mobile ? t.postings.length : Math.max(credits(t).length, debits(t).length);
    return 8 + count * 22 + (mobile ? 25 : 0);
  };

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

  onMount(async () => {
    await loadTransactions();
  });
</script>

<DiffViewModal
  on:save={(e) => saveAll(e.detail)}
  bind:open={openPreviewModal}
  oldFiles={files}
  {newFiles}
  {updatedTransactionsCount}
/>

{#if transactions}
  <Page width="fluid">
    <PageHeader
      title="Transactions"
      description="Journal transactions, search, and bulk edits"
    />

    <Section>
      <div class="paisa-transaction-toolbar-bar">
        <div class="paisa-transaction-search-controls">
          <div class="control is-expanded">
            <SearchQuery
              autocomplete={{
                account: accounts,
                commodity: commodities,
                filename: files.map((f) => f.name)
              }}
            />
          </div>
          <button
            class="button is-link is-light invertable"
            onclick={(_e) => (buldEditOpen = !buldEditOpen)}
          >
            <span>Bulk Edit</span>
            <span class="icon is-small">
              <i class="fas {buldEditOpen ? 'fa-angle-up' : 'fa-angle-down'}"></i>
            </span>
          </button>
        </div>

        <div class="paisa-transaction-meta-actions">
          <p class="is-size-7"><b>{filtered.length}</b> transaction(s)</p>
          <button
            type="button"
            class="paisa-button-reset has-text-link is-inline-flex is-align-items-center"
            onclick={(_e) => downloadTransactions()}
          >
            <span class="icon is-small">
              <i class="fa-solid fa-file-arrow-down"></i>
            </span>
            <span class="ml-1">download</span>
          </button>
        </div>
      </div>

      {#if buldEditOpen}
        <div class="mt-4" transition:slide>
          <BulkEditForm {accounts} on:preview={(e) => showPreview(e.detail)} />
        </div>
      {/if}
    </Section>

    <Section>
      <div class="box p-0">
        <VirtualList
          width="100%"
          height={window.innerHeight - 260}
          itemCount={filtered.length}
          {itemSize}
        >
          <svelte:fragment slot="item" let:index let:style>
            {@const t = filtered[index]}
            <div {style}>
              <Transaction {t} />
            </div>
          </svelte:fragment>
        </VirtualList>
      </div>
    </Section>
  </Page>
{/if}

<style lang="scss">
  .paisa-transaction-toolbar-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--paisa-space-3);
  }

  .paisa-transaction-search-controls {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    flex-grow: 1;
    min-width: 280px;
  }

  .paisa-transaction-meta-actions {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-4);
  }
</style>
