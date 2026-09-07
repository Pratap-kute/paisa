<script lang="ts">
import type { QualityIssue } from "$lib/features/diagnosis/types";
import Badge from "$lib/shared/ui/Badge.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import { obscure } from "$lib/shared/state/persisted";

interface Props {
  issue: QualityIssue;
}

let { issue }: Props = $props();

let level = $derived(issue.level?.toLowerCase() || "info");

let badgeVariant = $derived.by((): "danger" | "warning" | "info" => {
  if (level === "danger" || level === "error") return "danger";
  if (level === "warning") return "warning";
  return "info";
});

let levelLabel = $derived.by(() => {
  if (level === "danger" || level === "error") return "Critical";
  if (level === "warning") return "Warning";
  return "Info";
});

function formatCategory(cat?: string): string {
  if (!cat) return "General";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function maskText(text?: string): string {
  if (!text) return "";
  if (!$obscure) return text;
  // Obscure monetary and numerical figures when privacy mode is active
  return text.replace(/-?\b\d+(?:,\d+)*(?:\.\d+)?\b/g, "****");
}
</script>

<div
  class="flex items-start gap-3.5 px-4 py-4 sm:px-5 sm:py-4.5 text-sm transition-colors hover:bg-surface-hover/20"
  data-testid="diagnosis-issue-row"
  data-level={level}
  data-code={issue.code}
>
  <!-- Left: Status Icon -->
  <div class="flex h-5 w-5 shrink-0 items-center justify-center text-sm">
    {#if level === "danger" || level === "error"}
      <i class="fa-solid fa-triangle-exclamation text-negative"></i>
    {:else if level === "warning"}
      <i class="fa-solid fa-circle-exclamation text-warning"></i>
    {:else}
      <i class="fa-solid fa-circle-info text-primary"></i>
    {/if}
  </div>

  <!-- Right: Content Column -->
  <div class="flex min-w-0 flex-1 flex-col gap-2.5">
    <!-- Header: Title, Entity & Level/Category Badges -->
    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <h4 class="text-sm font-semibold text-foreground">
          {issue.summary}
        </h4>

        {#if issue.entity}
          <span class="inline-flex items-center gap-1 rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[0.6875rem] font-medium text-foreground">
            <i class="fa-solid {issue.entity.type === 'account' ? 'fa-folder' : (issue.entity.type === 'commodity' ? 'fa-coins' : 'fa-receipt')} text-[0.625rem] text-muted-foreground"></i>
            {issue.entity.label || issue.entity.id}
          </span>
        {/if}
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span class="rounded bg-surface-raised px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
          {formatCategory(issue.category)}
        </span>
        <Badge variant={badgeVariant} size="sm" rounded>
          {levelLabel}
        </Badge>
      </div>
    </div>

    <!-- Body Description -->
    <p class="text-xs leading-relaxed text-muted-foreground">
      {issue.description}
    </p>

    <!-- Context Details Bar -->
    {#if issue.details}
      <div class="rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface-raised/60 px-3 py-1.5 font-mono text-[0.6875rem] text-foreground/90 overflow-x-auto select-all">
        {maskText(issue.details)}
      </div>
    {/if}

    <!-- Footer: Affects + Action Button -->
    {#if (issue.affectedFeatures && issue.affectedFeatures.length > 0) || issue.action}
      <div class="mt-0.5 flex flex-wrap items-center justify-between gap-3 pt-1">
        {#if issue.affectedFeatures && issue.affectedFeatures.length > 0}
          <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span class="font-medium text-foreground/75">Affects:</span>
            {#each issue.affectedFeatures as feature, i}
              <span class="inline-flex items-center">
                <span class="rounded bg-surface-raised px-1.5 py-0.5 text-[0.6875rem] font-medium text-foreground">
                  {feature}
                </span>
                {#if i < issue.affectedFeatures.length - 1}
                  <span class="mx-1 text-muted-foreground">·</span>
                {/if}
              </span>
            {/each}
          </div>
        {:else}
          <div></div>
        {/if}

        {#if issue.action}
          <a
            href={issue.action.href}
            class="inline-flex items-center gap-1.5 rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-surface-raised hover:border-border hover:shadow-xs group"
            data-testid="issue-action-button"
          >
            <span>{issue.action.label}</span>
            <i class="fa-solid fa-arrow-right text-[0.625rem] text-muted-foreground transition-transform group-hover:translate-x-0.5"></i>
          </a>
        {/if}
      </div>
    {/if}
  </div>
</div>
