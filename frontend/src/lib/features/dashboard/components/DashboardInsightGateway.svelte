<script lang="ts">
import type { Insight } from "$lib/domain/insights";
import { presentInsight } from "$lib/features/insights/presentation";
import Spinner from "$lib/shared/ui/Spinner.svelte";

interface Props {
  preview?: Insight;
  attentionCount: number;
  period: string;
  isPartial?: boolean;
  comparisonPeriod?: string;
  loading?: boolean;
  failed?: boolean;
}

let {
  preview,
  attentionCount,
  period,
  isPartial = false,
  comparisonPeriod,
  loading = false,
  failed = false,
}: Props = $props();

let presentation = $derived(
  preview ? presentInsight(preview, isPartial, comparisonPeriod) : undefined,
);
</script>

<section
  class="rounded-xl p-3.5 sm:p-4 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs min-w-0"
  data-testid="dashboard-insights">
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-2 min-w-0">
      <i class="fa-solid fa-lightbulb text-xs text-[var(--paisa-primary)]"></i>
      <span class="text-xs font-semibold uppercase tracking-wider text-[var(--paisa-foreground)]">Financial Insights</span>
    </div>
    <a href={`/insights?period=${period}`} class="text-xs font-semibold text-[var(--paisa-primary)] uppercase tracking-wider hover:underline whitespace-nowrap">
      View Insights <i class="fa-solid fa-arrow-right text-[9px] ml-1"></i>
    </a>
  </div>

  {#if loading}
    <div class="py-3"><Spinner /></div>
  {:else if failed}
    <p class="mt-2 text-sm text-[var(--paisa-muted-foreground)]">Insights unavailable</p>
  {:else if presentation}
    <div class="mt-2 min-w-0" data-testid="dashboard-insight-preview">
      <p class="text-sm font-semibold text-[var(--paisa-foreground)]">
        {attentionCount > 0
          ? `${attentionCount} ${attentionCount === 1 ? "item needs" : "items need"} attention`
          : "Latest financial context"}
      </p>
      <a href={presentation.href || `/insights?period=${period}`} class="mt-1 flex items-center gap-2 min-w-0 text-sm text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-primary)]">
        <i class={`${presentation.icon} text-xs shrink-0`}></i>
        <span class="truncate">{presentation.title}</span>
      </a>
    </div>
  {:else}
    <p class="mt-2 text-sm text-[var(--paisa-muted-foreground)]">No material issues detected this month</p>
  {/if}
</section>
