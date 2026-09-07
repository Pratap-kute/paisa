<script lang="ts">
import Card from "$lib/shared/ui/Card.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";
import Skeleton from "$lib/shared/ui/Skeleton.svelte";

interface Props {
  dangerCount?: number;
  warningCount?: number;
  infoCount?: number;
  totalIssues?: number;
  passedChecks?: number;
  totalChecks?: number;
  lastChecked?: Date | null;
  loading?: boolean;
}

let {
  dangerCount = 0,
  warningCount = 0,
  infoCount = 0,
  totalIssues = 0,
  passedChecks = 0,
  totalChecks = 0,
  lastChecked = null,
  loading = false,
}: Props = $props();

let statusKind = $derived.by(() => {
  if (dangerCount > 0) return "danger";
  if (warningCount > 0) return "warning";
  if (infoCount > 0) return "info";
  return "clean";
});
</script>

<Card padding="md" class="w-full overflow-hidden"
  data-testid="diagnosis-status-banner">
  {#if loading}
    <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div class="flex items-center gap-4 text-center md:text-left">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-primary text-xl">
          <i class="fas fa-rotate-right animate-spin text-muted-foreground"></i>
        </div>
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span class="text-base font-bold text-foreground">Running diagnostics...</span>
            <Badge variant="neutral" size="sm" rounded>Scanning</Badge>
          </div>
          <p class="text-xs text-muted-foreground">
            Evaluating ledger integrity, valuation boundaries, and reconciliation.
          </p>
        </div>
      </div>
      <div>
        <Skeleton width="6rem" height="1.25rem" />
      </div>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div class="flex items-center gap-4 text-center md:text-left">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl {
            statusKind === 'danger'
              ? 'bg-negative/10 text-negative'
              : statusKind === 'warning'
                ? 'bg-warning/10 text-warning'
                : statusKind === 'info'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-positive/10 text-positive'
          }"
        >
          <i
            class="fas {
              statusKind === 'danger'
                ? 'fa-triangle-exclamation'
                : statusKind === 'warning'
                  ? 'fa-circle-exclamation'
                  : statusKind === 'info'
                    ? 'fa-circle-info'
                    : 'fa-circle-check'
            }"
          ></i>
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-center gap-2 md:justify-start">
            <h2 class="text-base font-bold text-foreground">
              {#if statusKind === "danger"}
                {dangerCount} potential issue(s) found
              {:else if statusKind === "warning"}
                No blocking issues · {warningCount} potential issue(s) found
              {:else if statusKind === "info"}
                All critical checks passed
              {:else}
                All Systems Operational
              {/if}
            </h2>
            <Badge
              variant={
                statusKind === "danger"
                  ? "danger"
                  : statusKind === "warning"
                    ? "warning"
                    : statusKind === "info"
                      ? "info"
                      : "success"
              }
              size="sm"
              rounded
            >
              {#if statusKind === "danger"}
                Attention Required
              {:else if statusKind === "warning"}
                Needs Review
              {:else if statusKind === "info"}
                Operational
              {:else}
                Healthy
              {/if}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground">
            {#if statusKind === "danger"}
              Review and resolve the integrity issues below to ensure accurate financial reporting.
            {:else if statusKind === "warning"}
              {warningCount} need review{infoCount > 0 ? ` · ${infoCount} informational` : ""}
            {:else if statusKind === "info"}
              {infoCount} informational note{infoCount > 1 ? "s" : ""} available below.
            {:else}
              Your ledger journals, configuration files, and price records are healthy with no syntax or balance errors.
            {/if}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if lastChecked}
          <span class="text-xs text-muted-foreground">
            Last checked: {lastChecked.toLocaleTimeString()}
          </span>
        {/if}
      </div>
    </div>
  {/if}
</Card>
