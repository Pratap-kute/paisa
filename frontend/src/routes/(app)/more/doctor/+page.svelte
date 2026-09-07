<script lang="ts">
import { api } from "$lib/api";
import type {
  DiagnosisResponse,
  DiagnosticCheck,
  QualityIssue,
} from "$lib/features/diagnosis/types";
import DiagnosisStatusBanner from "$lib/features/diagnosis/components/DiagnosisStatusBanner.svelte";
import DiagnosisMetrics from "$lib/features/diagnosis/components/DiagnosisMetrics.svelte";
import QualityIssueRow from "$lib/features/diagnosis/components/QualityIssueRow.svelte";
import HealthyChecksList from "$lib/features/diagnosis/components/HealthyChecksList.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import Card from "$lib/shared/ui/Card.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import { onMount } from "svelte";

let issues = $state<QualityIssue[]>([]);
let checks = $state<DiagnosticCheck[]>([]);
let summary = $state({
  total: 0,
  danger: 0,
  warning: 0,
  info: 0,
  passedChecks: 0,
  failedChecks: 0,
  totalChecks: 11,
});
let isLoading = $state(true);
let error = $state<string | null>(null);
let lastChecked = $state<Date | null>(null);

let attentionIssues = $derived(
  issues.filter((i) => i.level === "danger" || i.level === "warning"),
);

let infoIssues = $derived(issues.filter((i) => i.level === "info"));

async function runDiagnosis() {
  if (isLoading && lastChecked !== null) return;
  isLoading = true;
  error = null;
  try {
    const response =
      (await api.diagnosis.getDiagnosis()) as unknown as DiagnosisResponse;
    issues = response.issues || [];
    checks = response.checks || [];
    if (response.summary) {
      summary = {
        total: response.summary.total ?? issues.length,
        danger: response.summary.danger ?? 0,
        warning: response.summary.warning ?? 0,
        info: response.summary.info ?? 0,
        passedChecks: response.summary.passedChecks ??
          checks.filter((c) => c.status === "passed").length,
        failedChecks: response.summary.failedChecks ??
          checks.filter((c) => c.status === "failed").length,
        totalChecks: response.summary.totalChecks ?? (checks.length || 11),
      };
    } else {
      let d = 0, w = 0, inf = 0;
      for (const iss of issues) {
        if (iss.level === "danger") d++;
        else if (iss.level === "warning") w++;
        else inf++;
      }
      summary = {
        total: issues.length,
        danger: d,
        warning: w,
        info: inf,
        passedChecks: checks.filter((c) => c.status === "passed").length,
        failedChecks: checks.filter((c) => c.status === "failed").length,
        totalChecks: checks.length || 11,
      };
    }
    lastChecked = new Date();
  } catch (err: unknown) {
    error = err instanceof Error
      ? err.message
      : "Failed to load diagnostic results.";
  } finally {
    isLoading = false;
  }
}

onMount(() => {
  runDiagnosis();
});
</script>

<svelte:head>
  <title>Doctor - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Doctor"
    description="Automated diagnostic checks for journal integrity, valuation, and reconciliation"
  >
    {#snippet actions()}
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={isLoading}
          onclick={runDiagnosis}
        >
          {#snippet icon()}
            <i class="fas fa-rotate-right {isLoading ? 'animate-spin' : ''}"></i>
          {/snippet}
          <span>Run Diagnosis</span>
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  <Section>
    <div class="flex flex-col gap-6">
      {#if error}
        <!-- Diagnostic Failure State -->
        <Card padding="md" class="border-negative/30 bg-negative/5">
          <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-negative/10 text-negative">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-foreground">
                  Doctor could not complete the diagnostic checks
                </h3>
                <p class="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onclick={runDiagnosis}>
              Retry
            </Button>
          </div>
        </Card>
      {:else}
        <!-- Severity-Aware Health Status Banner -->
        <DiagnosisStatusBanner
          dangerCount={summary.danger}
          warningCount={summary.warning}
          infoCount={summary.info}
          totalIssues={summary.total}
          passedChecks={summary.passedChecks}
          failedChecks={summary.failedChecks}
          totalChecks={summary.totalChecks}
          {lastChecked}
          loading={isLoading}
          onretry={runDiagnosis}
        />

        <!-- KPI Metric Summary -->
        <DiagnosisMetrics
          dangerCount={summary.danger}
          warningCount={summary.warning}
          infoCount={summary.info}
          passedChecks={summary.passedChecks}
          totalChecks={summary.totalChecks}
          loading={isLoading}
        />

        <!-- Needs Attention Section (Critical & Warnings) -->
        {#if !isLoading && attentionIssues.length > 0}
          <div data-testid="diagnosis-attention-section">
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Needs Attention
            </h3>
            <Card padding="none" class="divide-y divide-border-subtle overflow-hidden">
              {#each attentionIssues as issue, index (`attention-${index}-${issue.code}-${issue.entity?.id ?? ""}`)}
                <QualityIssueRow {issue} />
              {/each}
            </Card>
          </div>
        {/if}

        <!-- Informational Section -->
        {#if !isLoading && infoIssues.length > 0}
          <div data-testid="diagnosis-info-section">
            <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Information
            </h3>
            <Card padding="none" class="divide-y divide-border-subtle overflow-hidden">
              {#each infoIssues as issue, index (`info-${index}-${issue.code}-${issue.entity?.id ?? ""}`)}
                <QualityIssueRow {issue} />
              {/each}
            </Card>
          </div>
        {/if}

        <!-- Healthy Checks Section -->
        <div>
          <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Healthy Checks
          </h3>
          <HealthyChecksList {checks} />
        </div>
      {/if}
    </div>
  </Section>
</Page>
