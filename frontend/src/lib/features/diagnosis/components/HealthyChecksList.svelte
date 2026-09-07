<script lang="ts">
import type { DiagnosticCheck } from "$lib/features/diagnosis/types";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  checks?: DiagnosticCheck[];
}

let { checks = [] }: Props = $props();

let passedChecks = $derived(checks.filter((c) => c.status === "passed"));
let failedChecks = $derived(checks.filter((c) => c.status === "failed"));
</script>

<div class="flex flex-col gap-3" data-testid="healthy-checks-list">
  {#if failedChecks.length > 0}
    <div class="mb-2 rounded-[var(--paisa-radius-sm)] border border-negative/20 bg-negative/5 p-3 text-xs text-negative">
      <div class="flex items-center gap-2 font-semibold">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>{failedChecks.length} check(s) could not execute:</span>
      </div>
      <ul class="mt-1 list-disc pl-5">
        {#each failedChecks as failed}
          <li>{failed.name || failed.code} (diagnostic engine error)</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if passedChecks.length > 0}
    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {#each passedChecks as check}
        <div
          class="flex items-center justify-between rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface px-3.5 py-2.5 shadow-sm text-xs transition-colors hover:border-border hover:bg-surface-raised/40"
          data-testid="healthy-check-item"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-positive/10 text-positive">
              <i class="fa-solid fa-check text-[0.625rem]"></i>
            </div>
            <span class="font-medium text-foreground truncate">{check.name || check.code}</span>
          </div>
          <span class="ml-2 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {check.category || "General"}
          </span>
        </div>
      {/each}
    </div>
  {:else if checks.length === 0}
    <p class="text-xs text-muted-foreground">No checks evaluated yet.</p>
  {/if}
</div>
