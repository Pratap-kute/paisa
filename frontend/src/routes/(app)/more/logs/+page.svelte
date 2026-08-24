<script lang="ts">
  import { onMount } from "svelte";
  import { ajax, type Log } from "$lib/core/utils";
  import VirtualList from "svelte-tiny-virtual-list";
  import { omit } from "es-toolkit";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import Badge from "$lib/shared/ui/Badge.svelte";
  import Button from "$lib/shared/ui/Button.svelte";
  import Card from "$lib/shared/ui/Card.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";

  let logs: Log[] = $state([]);
  let searchQuery = $state("");
  let selectedLevel = $state("all");
  let isLoading = $state(true);
  const ITEM_SIZE = 38;
  let listHeight = $state(600);

  function updateDimensions() {
    if (typeof window !== "undefined") {
      listHeight = Math.max(360, window.innerHeight - 250);
    }
  }

  async function fetchLogs() {
    isLoading = true;
    try {
      const data = await ajax("/api/logs");
      logs = data.logs || [];
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    fetchLogs();
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  });

  // Filter logs by level and search query
  let filteredLogs = $derived.by(() => {
    let result = logs;
    if (selectedLevel !== "all") {
      result = result.filter(
        (l) => l.level?.toLowerCase() === selectedLevel.toLowerCase(),
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        const msgMatch = l.msg?.toLowerCase().includes(q);
        const levelMatch = l.level?.toLowerCase().includes(q);
        const fieldsMatch = Object.entries(omit(l, ["time", "level", "msg"])).some(
          ([k, v]) =>
            k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q),
        );
        return msgMatch || levelMatch || fieldsMatch;
      });
    }
    return result;
  });

  // Log counts by level
  let counts = $derived.by(() => {
    let total = logs.length;
    let info = 0;
    let warn = 0;
    let error = 0;
    for (const l of logs) {
      const lvl = l.level?.toLowerCase();
      if (lvl === "info") info++;
      else if (lvl === "warning" || lvl === "warn") warn++;
      else if (lvl === "error" || lvl === "fatal") error++;
    }
    return { total, info, warn, error };
  });

  function levelVariant(level: string): "info" | "warning" | "danger" | "neutral" {
    switch (level?.toLowerCase()) {
      case "info":
        return "info";
      case "warning":
      case "warn":
        return "warning";
      case "error":
      case "fatal":
        return "danger";
      default:
        return "neutral";
    }
  }

  function formatTime(time: any): string {
    if (!time) return "";
    if (typeof time.format === "function") {
      return time.format("YYYY-MM-DD HH:mm:ss");
    }
    return String(time);
  }
</script>

<svelte:head>
  <title>Logs - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="Logs"
    description="Application log viewer with real-time level filtering and structured fields"
  >
    {#snippet actions()}
      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" onclick={fetchLogs}>
          {#snippet icon()}
            <i class="fas fa-rotate-right {isLoading ? 'animate-spin' : ''}"></i>
          {/snippet}
          <span>Refresh</span>
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  <Section>
    <!-- Filter & Control Toolbar -->
    <Card padding="sm" class="mb-3 w-full">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Level Filters -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--paisa-radius-md)] px-2.5 py-1 text-xs font-semibold transition-colors {selectedLevel === 'all' ? 'bg-[var(--paisa-brand-primary)] text-[var(--paisa-text-inverse)]' : 'bg-[var(--paisa-surface-2)] text-[var(--paisa-text-secondary)] hover:bg-[var(--paisa-surface-hover)]'}"
            onclick={() => (selectedLevel = "all")}
          >
            <span>All</span>
            <span class="rounded-full bg-black/20 px-1.5 py-0.2 text-[0.6875rem]">{counts.total}</span>
          </button>

          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--paisa-radius-md)] px-2.5 py-1 text-xs font-semibold transition-colors {selectedLevel === 'info' ? 'bg-[var(--paisa-info)] text-[var(--paisa-text-inverse)]' : 'bg-[var(--paisa-surface-2)] text-[var(--paisa-text-secondary)] hover:bg-[var(--paisa-surface-hover)]'}"
            onclick={() => (selectedLevel = "info")}
          >
            <span>Info</span>
            <span class="rounded-full bg-black/20 px-1.5 py-0.2 text-[0.6875rem]">{counts.info}</span>
          </button>

          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--paisa-radius-md)] px-2.5 py-1 text-xs font-semibold transition-colors {selectedLevel === 'warning' ? 'bg-[var(--paisa-warning)] text-[var(--paisa-text-inverse)]' : 'bg-[var(--paisa-surface-2)] text-[var(--paisa-text-secondary)] hover:bg-[var(--paisa-surface-hover)]'}"
            onclick={() => (selectedLevel = "warning")}
          >
            <span>Warning</span>
            <span class="rounded-full bg-black/20 px-1.5 py-0.2 text-[0.6875rem]">{counts.warn}</span>
          </button>

          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--paisa-radius-md)] px-2.5 py-1 text-xs font-semibold transition-colors {selectedLevel === 'error' ? 'bg-[var(--paisa-danger)] text-[var(--paisa-text-inverse)]' : 'bg-[var(--paisa-surface-2)] text-[var(--paisa-text-secondary)] hover:bg-[var(--paisa-surface-hover)]'}"
            onclick={() => (selectedLevel = "error")}
          >
            <span>Error</span>
            <span class="rounded-full bg-black/20 px-1.5 py-0.2 text-[0.6875rem]">{counts.error}</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative flex flex-1 min-w-[200px] max-w-sm items-center">
          <i class="fas fa-magnifying-glass absolute left-2.5 text-xs text-[var(--paisa-text-muted)]"></i>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search logs, routes, IPs..."
            class="w-full rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] py-1.5 pl-8 pr-3 text-xs text-[var(--paisa-text-primary)] placeholder-[var(--paisa-text-muted)] transition-colors focus:border-[var(--paisa-brand-primary)] focus:bg-[var(--paisa-surface)] focus:outline-none"
          />
          {#if searchQuery}
            <button
              type="button"
              class="absolute right-2 text-xs text-[var(--paisa-text-muted)] hover:text-[var(--paisa-text-primary)]"
              aria-label="Clear search"
              onclick={() => (searchQuery = "")}
            >
              <i class="fas fa-xmark"></i>
            </button>
          {/if}
        </div>
      </div>
    </Card>

    <!-- Structured Virtualized Log Table -->
    <div
      class="overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] shadow-sm"
    >
      <!-- Header Row -->
      <div class="flex min-w-[950px] items-center border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-2)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
        <div class="w-[155px] shrink-0">Timestamp</div>
        <div class="w-[75px] shrink-0">Level</div>
        <div class="w-[420px] shrink-0">Message</div>
        <div class="min-w-0 flex-1">Context Fields</div>
      </div>

      {#if filteredLogs.length === 0}
        <div class="py-16">
          <ZeroState item={[]}>
            <p class="text-sm text-[var(--paisa-muted-foreground)]">
              {logs.length === 0 ? "No logs recorded yet." : "No logs matching current filters."}
            </p>
          </ZeroState>
        </div>
      {:else}
        <VirtualList width="100%" height={listHeight} itemCount={filteredLogs.length} itemSize={ITEM_SIZE}>
          <svelte:fragment slot="item" let:index let:style>
            {@const log = filteredLogs[index]}
            {@const fields = omit(log, ["time", "level", "msg"])}
            <div {style} class="border-b border-[var(--paisa-border-subtle)] transition-colors hover:bg-[var(--paisa-surface-hover)]">
              <div
                class="flex min-w-[950px] items-center gap-2 px-3 text-xs font-mono"
                style="height: {ITEM_SIZE}px;"
              >
                <!-- Timestamp -->
                <div class="w-[155px] shrink-0 font-mono text-[0.75rem] text-[var(--paisa-muted-foreground)]">
                  {formatTime(log.time)}
                </div>

                <!-- Level Badge -->
                <div class="w-[75px] shrink-0">
                  <Badge variant={levelVariant(log.level)} size="sm" class="uppercase">
                    {log.level}
                  </Badge>
                </div>

                <!-- Message -->
                <div
                  class="paisa-truncate w-[420px] shrink-0 text-[0.8125rem] font-medium text-[var(--paisa-text-primary)]"
                  title={log.msg}
                >
                  {log.msg}
                </div>

                <!-- Structured Context Fields -->
                <div
                  class="paisa-truncate min-w-0 flex-1 text-[0.725rem] text-[var(--paisa-muted-foreground)]"
                >
                  {#each Object.entries(fields) as [key, value]}
                    <span class="mr-2 inline-flex items-center rounded bg-[var(--paisa-surface-2)] px-1.5 py-0.5 border border-[var(--paisa-border-subtle)]">
                      <span class="text-[var(--paisa-text-secondary)]">{key}:</span>
                      <span class="ml-1 font-semibold text-[var(--paisa-text-primary)]">{value}</span>
                    </span>
                  {/each}
                </div>
              </div>
            </div>
          </svelte:fragment>
        </VirtualList>
      {/if}
    </div>
  </Section>
</Page>
