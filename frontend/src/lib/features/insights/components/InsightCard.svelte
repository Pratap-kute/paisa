<script lang="ts">
import type { Insight } from "$lib/domain/insights";
import { presentInsight } from "../presentation";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  insight: Insight;
  isPartial?: boolean;
  comparisonPeriod?: string;
  compact?: boolean;
}

let {
  insight,
  isPartial = false,
  comparisonPeriod,
  compact = false,
}: Props = $props();

let p = $derived(presentInsight(insight, isPartial, comparisonPeriod));

const toneToBadgeVariant: Record<
  string,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  positive: "success",
  warning: "warning",
  critical: "danger",
  info: "info",
  neutral: "neutral",
};

const toneToAccent: Record<
  string,
  { border: string; bg: string; iconBg: string; text: string }
> = {
  critical: {
    border: "border-l-[3px] border-l-[var(--paisa-negative)]",
    bg: "hover:border-[var(--paisa-negative)]/40",
    iconBg: "text-[var(--paisa-negative)] bg-[var(--paisa-negative-subtle)]",
    text: "text-[var(--paisa-negative)]",
  },
  warning: {
    border: "border-l-[3px] border-l-[var(--paisa-warning)]",
    bg: "hover:border-[var(--paisa-warning)]/40",
    iconBg: "text-[var(--paisa-warning)] bg-[var(--paisa-warning-subtle)]",
    text: "text-[var(--paisa-warning)]",
  },
  positive: {
    border: "border-l-[3px] border-l-[var(--paisa-positive)]",
    bg: "hover:border-[var(--paisa-positive)]/40",
    iconBg: "text-[var(--paisa-positive)] bg-[var(--paisa-positive-subtle)]",
    text: "text-[var(--paisa-positive)]",
  },
  info: {
    border: "border-l-[3px] border-l-[var(--paisa-primary)]",
    bg: "hover:border-[var(--paisa-primary)]/40",
    iconBg: "text-[var(--paisa-primary)] bg-[var(--paisa-primary-subtle)]",
    text: "text-[var(--paisa-primary)]",
  },
  neutral: {
    border: "border-l-[3px] border-l-[var(--paisa-border-strong)]",
    bg: "hover:border-[var(--paisa-border-strong)]",
    iconBg:
      "text-[var(--paisa-muted-foreground)] bg-[var(--paisa-surface-hover)]",
    text: "text-[var(--paisa-muted-foreground)]",
  },
};

let accent = $derived(toneToAccent[p.tone] || toneToAccent.info);
</script>

{#if compact}
  <!-- Ultra-Compact Dashboard Card (Single Row Fit) -->
  <a
  href={p.href}
  class="flex flex-col justify-between p-3 rounded-lg bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] {accent.border} shadow-xs hover:shadow-sm hover:bg-[var(--paisa-surface-hover)] transition-all duration-150 group min-w-0"
>
  <div class="flex items-center justify-between gap-1.5 mb-1.5">
      <div class="flex items-center gap-1.5 min-w-0">
        <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded {accent.iconBg}">
          <i class="{p.icon} text-[10px]"></i>
        </div>
        <span class="text-[11px] font-semibold uppercase tracking-wider text-[var(--paisa-muted-foreground)] truncate">
          {p.categoryLabel}
        </span>
      </div>
      {#if p.badgeText}
        <Badge variant={toneToBadgeVariant[p.tone] || "neutral"} size="sm" rounded>
          {p.badgeText}
        </Badge>
      {/if}
    </div>

  <div class="min-w-0">
      <h4 class="text-xs font-semibold text-[var(--paisa-foreground)] group-hover:text-[var(--paisa-primary)] transition-colors truncate">
        {p.title}
      </h4>
      {#if p.description}
        <p class="text-[11px] text-[var(--paisa-muted-foreground)] truncate mt-0.5">
          {p.description}
        </p>
      {/if}
    </div>
</a>
{:else}
  <!-- Standard Page Card (Clean, Proportional & Balanced) -->
  <a
  href={p.href}
  class="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] {accent.border} shadow-xs hover:shadow-md transition-all duration-150 group min-w-0"
>
  <div>
      <!-- Header: Category + Badge -->
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded {accent.iconBg}">
            <i class="{p.icon} text-[10px]"></i>
          </div>
          <span class="text-xs font-semibold uppercase tracking-wider text-[var(--paisa-muted-foreground)] truncate">
            {p.categoryLabel}
          </span>
        </div>
        {#if p.badgeText}
          <Badge variant={toneToBadgeVariant[p.tone] || "neutral"} size="sm" rounded>
            {p.badgeText}
          </Badge>
        {/if}
      </div>

      <!-- Hero Metric + Subtitle -->
      {#if p.heroMetric}
        <div class="flex items-baseline gap-1.5 flex-wrap mb-1.5">
          <span class="text-lg sm:text-xl font-bold tabular-nums tracking-tight {accent.text}">
            {p.heroMetric}
          </span>
          {#if p.heroLabel}
            <span class="text-[11px] font-medium text-[var(--paisa-muted-foreground)] truncate">
              {p.heroLabel}
            </span>
          {/if}
        </div>
      {/if}

      <!-- Narrative -->
      <div class="space-y-0.5 mb-2.5 min-w-0">
        <h4 class="text-xs sm:text-sm font-semibold text-[var(--paisa-foreground)] group-hover:text-[var(--paisa-primary)] transition-colors leading-snug">
          {p.title}
        </h4>
        {#if p.description}
          <p class="text-[11px] sm:text-xs text-[var(--paisa-muted-foreground)] leading-normal line-clamp-2">
            {p.description}
          </p>
        {/if}
      </div>

      <!-- Micro Visual: Budget Progress Bar -->
      {#if p.progressPercent != null}
        <div class="mb-2.5">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)]">
            <div
              class="h-full rounded-full transition-all {p.progressTone === 'critical' ? 'bg-[var(--paisa-negative)]' : (p.progressTone === 'warning' ? 'bg-[var(--paisa-warning)]' : 'bg-[var(--paisa-positive)]')}"
              style="width: {Math.min(100, Math.max(0, p.progressPercent))}%"
            ></div>
          </div>
        </div>
      {/if}

      <!-- Micro Visual: Tags -->
      {#if p.tags && p.tags.length > 0}
        <div class="flex flex-wrap gap-1 mb-2.5">
          {#each p.tags as tag}
            <span class="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--paisa-surface-raised)] border border-[var(--paisa-border-subtle)] text-[var(--paisa-foreground)]">
              {tag.label}
            </span>
          {/each}
        </div>
      {/if}
    </div>

  <!-- Action Footer -->
  <div
    class="pt-2 mt-1 border-t border-[var(--paisa-border-subtle)] flex items-center justify-between text-[11px] font-semibold text-[var(--paisa-primary)]">
    <span class="group-hover:underline">
        {p.actionText || "View Details"}
      </span>
    <i
      class="fa-solid fa-arrow-right text-[9px] transform group-hover:translate-x-0.5 transition-transform"></i>
  </div>
</a>
{/if}
