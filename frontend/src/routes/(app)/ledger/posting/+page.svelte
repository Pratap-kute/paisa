<script lang="ts">
  import { accountColorStyle } from "$lib/core/colors";
  import PostingNote from "$lib/components/transactions/PostingNote.svelte";
  import PostingStatus from "$lib/components/transactions/PostingStatus.svelte";
  import SearchQuery from "$lib/components/ledger/SearchQuery.svelte";
  import { iconText } from "$lib/core/icon";
  import { change } from "$lib/domain/posting";
  import { editorState } from "$lib/editors/search_query_editor";
  import {
    ajax,
    postingUrl,
    type Posting,
    formatCurrency,
    formatFloat,
    firstName,
    type LedgerFile,
    type Transaction,
    asTransaction
  } from "$lib/core/utils";
  import _ from "lodash";
  import { get } from "svelte/store";
  import { onDestroy, onMount } from "svelte";
  import VirtualList from "svelte-tiny-virtual-list";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let files: LedgerFile[] = $state([]);
  let accounts: string[] = $state([]);
  let commodities: string[] = $state([]);
  let postings: Posting[] | null = $state(null);

  let filteredPostings: Posting[] = $state([]);
  let rows: { posting: Posting; transaction: Transaction }[] = [];
  let listHeight = $state(600);

  function handleInputRaw(predicate: (t: Transaction) => boolean) {
    if (!postings) return;
    filteredPostings = rows.filter((r) => predicate(r.transaction)).map((r) => r.posting);
  }

  const handleInput = _.debounce(handleInputRaw, 100);

  const unsubscribe = editorState.subscribe((state) => {
    handleInput(state.predicate);
  });

  onDestroy(() => {
    unsubscribe();
  });

  function updateDimensions() {
    if (typeof window !== "undefined") {
      listHeight = Math.max(320, window.innerHeight - 220);
    }
  }

  async function loadPostings() {
    ({ files, accounts, commodities } = await ajax("/api/editor/files"));
    const { postings: loadedPostings } = await ajax("/api/ledger");
    postings = loadedPostings;
    rows = _.map(loadedPostings, (p) => ({
      posting: p,
      transaction: asTransaction(p)
    }));
    handleInputRaw(get(editorState).predicate);
  }

  onMount(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    loadPostings();
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  });

  function unlessDefault(p: Posting, text: string) {
    if (p.commodity !== USER_CONFIG.default_currency) {
      return text;
    }
    return "";
  }

  function unlessZero(value: number, text: string) {
    if (value > 0) {
      return text;
    }
    return "";
  }
</script>

<svelte:head>
  <title>Postings — Paisa</title>
</svelte:head>

<div class="flex w-full min-w-0 max-w-full flex-col gap-5">
  <PageHeader
    title="Postings"
    description="Search postings, filter by account or commodity, and inspect balances"
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

      <div class="whitespace-nowrap rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] px-2.5 py-1.5 text-[0.8125rem] text-[var(--paisa-muted-foreground)] max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-xs">
        <p class="m-0 inline">
          <b class="text-[var(--paisa-foreground)]">{filteredPostings.length}</b> posting(s)
        </p>
      </div>
    </div>

    {#if postings}
      <div class="flex w-full min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] shadow-[var(--paisa-shadow-sm)]">
        <div class="paisa-posting-table-container">
          <div class="paisa-posting-table">
            <div class="posting-row items-baseline gap-1 px-3 pb-2 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--paisa-muted-foreground)]">
              <div>Date</div>
              <div>Description</div>
              <div>Account</div>
              <div class="text-right">Amount</div>
              <div class="text-right">Balance</div>
              <div class="text-right">Units</div>
              <div class="text-right">Unit Price</div>
              <div class="text-right">Market Value</div>
              <div class="text-right">Change</div>
              <div class="text-right">CAGR</div>
            </div>

            {#if filteredPostings.length > 0}
              <VirtualList
                width="100%"
                height={listHeight}
                itemCount={filteredPostings.length}
                itemSize={27}
              >
                <svelte:fragment slot="item" let:index let:style>
                  {@const p = filteredPostings[index]}
                  {@const c = change(p)}
                  <div
                    class="posting-row items-baseline gap-1 px-3 pt-1 transition-colors hover:bg-[var(--paisa-surface-hover)]"
                    {style}
                  >
                    <div class="text-[0.8125rem] text-[var(--paisa-foreground)]">
                      {p.date.format("DD MMM YYYY")}
                    </div>
                    <div class="paisa-truncate text-xs text-[var(--paisa-foreground)]" title={p.payee}>
                      <PostingStatus posting={p} />
                      <PostingNote posting={p} />
                      <a class="secondary-link" href={postingUrl(p)}>{p.payee}</a>
                    </div>
                    <div class="custom-icon paisa-truncate text-[0.8125rem] text-[var(--paisa-foreground)]" title={p.account}>
                      <div class="flex">
                        <span class="mr-1" style={accountColorStyle(firstName(p.account))}
                          >{iconText(p.account)}</span
                        >
                        {p.account}
                      </div>
                    </div>
                    <div class="text-right text-[0.8125rem] tabular-nums">{formatCurrency(p.amount, 2)}</div>
                    <div class="text-right text-[0.8125rem] tabular-nums">{formatCurrency(p.balance, 2)}</div>
                    <div class="text-right text-[0.8125rem] tabular-nums">{unlessDefault(p, formatFloat(p.quantity, 4))}</div>
                    <div class="text-right text-[0.8125rem] tabular-nums">
                      {unlessDefault(p, formatCurrency(Math.abs(p.amount / p.quantity), 4))}
                    </div>
                    <div class="text-right text-[0.8125rem] tabular-nums">
                      {unlessDefault(p, unlessZero(c.days, formatCurrency(p.market_amount)))}
                    </div>
                    <div class="text-right text-[0.8125rem] tabular-nums {c.class}">
                      {unlessZero(c.value, formatCurrency(c.value))}
                    </div>
                    <div class="text-right text-[0.8125rem] tabular-nums {c.class}">
                      {unlessZero(c.percentage, formatFloat(c.percentage))}
                    </div>
                  </div>
                </svelte:fragment>
              </VirtualList>
            {:else}
              <ZeroState item={[]}>
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paisa-surface-raised)] text-xl text-[var(--paisa-muted-foreground)]">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <div class="mb-1 text-[0.9375rem] font-semibold text-[var(--paisa-foreground)]">
                  No postings match your search
                </div>
                <div class="max-w-[360px] text-[0.8125rem] text-[var(--paisa-muted-foreground)]">
                  Try adjusting your query terms, account filters, or date range.
                </div>
              </ZeroState>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="flex items-center justify-center gap-3 rounded-[var(--paisa-radius-lg)] border border-[var(--paisa-border)] bg-[var(--paisa-surface)] px-6 py-16 text-sm text-[var(--paisa-muted-foreground)]">
        <div class="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paisa-border-strong)] border-t-[var(--paisa-primary)]"></div>
        <span>Loading postings...</span>
      </div>
    {/if}
  </div>
</div>
