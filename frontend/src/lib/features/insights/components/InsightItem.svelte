<script lang="ts">
import type { Insight } from "$lib/domain/insights";
import { presentInsight } from "../presentation";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  insight: Insight;
  isPartial?: boolean;
  comparisonPeriod?: string;
}

let { insight, isPartial = false, comparisonPeriod }: Props = $props();

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

const toneToColorClass: Record<string, { icon: string; border: string }> = {
  positive: {
    icon: "text-positive bg-positive-subtle",
    border: "border-l-2 border-l-[var(--paisa-positive)]",
  },
  warning: {
    icon: "text-warning bg-warning-subtle",
    border: "border-l-2 border-l-[var(--paisa-warning)]",
  },
  critical: {
    icon: "text-negative bg-negative-subtle",
    border: "border-l-2 border-l-[var(--paisa-negative)]",
  },
  info: {
    icon: "text-primary bg-primary-subtle",
    border: "border-l-2 border-l-[var(--paisa-primary)]",
  },
  neutral: {
    icon: "text-muted-foreground bg-surface-hover",
    border: "border-l-2 border-l-[var(--paisa-border-strong)]",
  },
};

let colorConfig = $derived(toneToColorClass[p.tone] || toneToColorClass.info);
</script>

<a
  href={p.href}
  class="flex items-center justify-between p-3.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle {colorConfig.border} transition-all group"
>
  <div class="flex items-center gap-3 min-w-0 pr-3">
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md {colorConfig.icon}">
      <i class="{p.icon} text-xs"></i>
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {p.categoryLabel}
        </span>
        <span class="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {p.title}
        </span>
      </div>
      {#if p.description}
        <p class="text-xs text-muted-foreground mt-0.5 truncate">
          {p.description}
        </p>
      {/if}
    </div>
  </div>

  <div class="flex items-center gap-2 shrink-0 ml-2">
    {#if p.badgeText}
      <Badge variant={toneToBadgeVariant[p.tone] || "neutral"} size="sm" rounded>
        {p.badgeText}
      </Badge>
    {/if}
    <i class="fa-solid fa-chevron-right text-[10px] text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"></i>
  </div>
</a>
