<script lang="ts">
  import { onMount } from "svelte";
  import { ajax, type Log } from "$lib/core/utils";
  import VirtualList from "svelte-tiny-virtual-list";
  import _ from "lodash";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";

  let logs: Log[] = $state([]);
  const ITEM_SIZE = 20;
  let listHeight = $state(600);

  function updateDimensions() {
    if (typeof window !== "undefined") {
      listHeight = Math.max(320, window.innerHeight - 130);
    }
  }

  onMount(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    ajax("/api/logs").then((data) => {
      ({ logs } = data);
    });
    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  });

  function levelVariant(level: string): "info" | "warning" | "danger" | "neutral" {
    switch (level) {
      case "info":
        return "info";
      case "warning":
        return "warning";
      case "error":
      case "fatal":
        return "danger";
      default:
        return "neutral";
    }
  }

  function formatFields(log: Log) {
    return _.map(_.omit(log, ["time", "level", "msg"]), (value, key) => `${key}=${value}`).join(
      ", "
    );
  }
</script>

<Page width="fluid">
  <PageHeader
    title="Logs"
    description="Application log viewer with level filtering and structured fields"
  />

  <Section>
    <div
      class="overflow-x-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] px-2"
    >
      <VirtualList width="100%" height={listHeight} itemCount={logs.length} itemSize={ITEM_SIZE}>
        <svelte:fragment slot="item" let:index let:style>
          {@const log = logs[index]}
          {@const fields = _.omit(log, ["time", "level", "msg"])}
          <div {style}>
            <div
              class="flex min-w-[1000px] items-baseline gap-1.5 px-1"
              style="height: {ITEM_SIZE}px;"
            >
              <div class="w-[125px] shrink-0 text-xs text-[var(--paisa-muted-foreground)]">
                {log.time.format("YYYY-MM-DD HH:mm:ss")}
              </div>
              <Badge variant={levelVariant(log.level)} size="sm" class="w-[60px] shrink-0 uppercase">
                {log.level}
              </Badge>
              <div class="paisa-truncate w-[500px] text-sm text-[var(--paisa-foreground)]" title={log.msg}>
                {log.msg}
              </div>
              <div
                class="paisa-truncate min-w-0 flex-1 font-mono text-xs text-[var(--paisa-muted-foreground)]"
                title={formatFields(log)}
              >
                {#each Object.entries(fields) as [key, value]}
                  <span class="px-1"><span>{key}</span>=<span>{value}</span></span>
                {/each}
              </div>
            </div>
          </div>
        </svelte:fragment>
      </VirtualList>
    </div>
  </Section>
</Page>
