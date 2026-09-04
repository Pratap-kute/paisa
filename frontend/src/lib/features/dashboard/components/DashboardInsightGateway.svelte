<script lang="ts">
import type { DashboardAttentionItem, MetricStatus } from "../summary";
import Spinner from "$lib/shared/ui/Spinner.svelte";

interface Props {
  items: DashboardAttentionItem[];
  period: string;
  loading?: boolean;
  failed?: boolean;
}

let {
  items,
  period,
  loading = false,
  failed = false,
}: Props = $props();

const statusClass: Record<MetricStatus, string> = {
  neutral: "text-muted-foreground",
  positive: "text-positive",
  negative: "text-negative",
  warning: "text-warning",
  primary: "text-primary",
};
</script>

<section
  class="rounded-xl p-3.5 sm:p-4 bg-surface border border-border-subtle shadow-xs min-w-0"
  data-testid="dashboard-insights">
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-2 min-w-0">
      <i class="fa-solid fa-lightbulb text-xs text-primary"></i>
      <span class="text-xs font-semibold uppercase tracking-wider text-foreground">Financial Insights</span>
    </div>
    <a href={`/insights?period=${period}`} class="text-xs font-semibold text-primary uppercase tracking-wider hover:underline whitespace-nowrap">
      View Insights <i class="fa-solid fa-arrow-right text-[9px] ml-1"></i>
    </a>
  </div>

  {#if loading}
    <div class="py-3"><Spinner /></div>
  {:else if failed}
    <p class="mt-2 text-sm text-muted-foreground">Insights unavailable</p>
  {:else if items.length > 0}
    <div class="mt-2 min-w-0">
      <p class="text-sm font-semibold text-foreground">
        {items.length} {items.length === 1 ? "item needs" : "items need"} attention
      </p>
      <div class="mt-1 divide-y divide-[var(--paisa-border-subtle)]">
        {#each items as item (item.id)}
          <a
            href={item.href}
            class="group flex min-w-0 items-start gap-2 rounded-md py-2 focus-visible:outline-2 focus-visible:outline-[var(--paisa-primary)]"
            data-testid="dashboard-attention-item"
          >
            {#if item.iconIsGlyph}
              <span class={`custom-icon ${statusClass[item.status]} mt-0.5 w-4 shrink-0 text-center text-sm`} aria-hidden="true">{item.icon}</span>
            {:else}
              <i class={`${item.icon} ${statusClass[item.status]} mt-0.5 w-4 shrink-0 text-xs text-center`} aria-hidden="true"></i>
            {/if}
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium leading-snug text-foreground group-hover:text-primary break-words">{item.title}</span>
              {#if item.detail}<span class="mt-0.5 block text-xs leading-snug text-muted-foreground line-clamp-2 break-words">{item.detail}</span>{/if}
            </span>
          </a>
        {/each}
      </div>
    </div>
  {:else}
    <p class="mt-2 text-sm text-muted-foreground">No material issues detected this month</p>
  {/if}
</section>
