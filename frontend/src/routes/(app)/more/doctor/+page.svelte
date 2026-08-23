<script lang="ts">
  import { onMount } from "svelte";
  import { ajax, type Issue } from "$lib/core/utils";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";

  let issues: Issue[] = $state([]);
  let isLoading = $state(true);
  let lastChecked = $state<Date | null>(null);

  async function runDiagnosis() {
    isLoading = true;
    try {
      const response = await ajax("/api/diagnosis");
      issues = response.issues || [];
      lastChecked = new Date();
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    runDiagnosis();
  });

  const diagnosticChecks = [
    {
      title: "Journal Syntax & Balance",
      desc: "Checks double-entry balance, valid accounts, and transaction formats",
      icon: "fa-solid fa-scale-balanced",
    },
    {
      title: "Configuration Health",
      desc: "Validates configuration parameters, file paths, and commodity mappings",
      icon: "fa-solid fa-gear",
    },
    {
      title: "Price DB & Commodities",
      desc: "Verifies historical price entries, dates, and currency exchange rates",
      icon: "fa-solid fa-chart-line",
    },
    {
      title: "Import Rules & Templates",
      desc: "Validates bank statement regex rules and auto-tagging transformations",
      icon: "fa-solid fa-file-import",
    },
  ];

  let issueCounts = $derived.by(() => {
    let warning = 0;
    let danger = 0;
    let info = 0;
    for (const issue of issues) {
      if (issue.level === "warning") warning++;
      else if (issue.level === "danger" || issue.level === "error") danger++;
      else info++;
    }
    return { total: issues.length, warning, danger, info };
  });

  function levelVariant(level: string): "info" | "warning" | "danger" | "neutral" {
    switch (level?.toLowerCase()) {
      case "danger":
      case "error":
        return "danger";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "neutral";
    }
  }
</script>

<svelte:head>
  <title>Doctor - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Doctor"
    description="Automated diagnostic checks for journal integrity, configuration, and price records"
  >
    {#snippet actions()}
      <div class="flex items-center gap-2">
        <Button variant="secondary" size="sm" onclick={runDiagnosis}>
          {#snippet icon()}
            <i class="fas fa-rotate-right {isLoading ? 'animate-spin' : ''}"></i>
          {/snippet}
          <span>Run Diagnosis</span>
        </Button>
      </div>
    {/snippet}
  </PageHeader>

  <Section>
    <div class="flex flex-col gap-5">
      <!-- High-Level Health Status Banner -->
      <Card padding="md" class="w-full overflow-hidden">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div class="flex items-center gap-4 text-center md:text-left">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full {issues.length === 0 ? 'bg-[var(--paisa-positive)]/10 text-[var(--paisa-positive)]' : 'bg-[var(--paisa-negative)]/10 text-[var(--paisa-negative)]'} text-xl">
              <i class="fas {issues.length === 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i>
            </div>
            <div>
              <div class="flex items-center justify-center gap-2 md:justify-start">
                <h2 class="text-base font-bold text-[var(--paisa-text-primary)]">
                  {issues.length === 0 ? "All Systems Operational" : `${issues.length} potential issue(s) found`}
                </h2>
                <Badge variant={issues.length === 0 ? "success" : "danger"} size="sm" rounded>
                  {issues.length === 0 ? "Healthy" : "Attention Required"}
                </Badge>
              </div>
              <p class="text-xs text-[var(--paisa-muted-foreground)]">
                {issues.length === 0
                  ? "Your ledger journals, configuration files, and price records are healthy with no syntax or balance errors."
                  : "Review the diagnostic reports below to resolve configuration warnings or journal inconsistencies."}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            {#if lastChecked}
              <span class="text-xs text-[var(--paisa-text-muted)]">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            {/if}
          </div>
        </div>
      </Card>

      <!-- KPI Metric Summary -->
      <MetricStrip cols="auto">
        <Metric
          label="Total Issues"
          value={String(issueCounts.total)}
          status={issueCounts.total === 0 ? "positive" : "negative"}
        />
        <Metric
          label="Critical Errors"
          value={String(issueCounts.danger)}
          status={issueCounts.danger === 0 ? "neutral" : "negative"}
        />
        <Metric
          label="Warnings"
          value={String(issueCounts.warning)}
          status={issueCounts.warning === 0 ? "neutral" : "warning"}
        />
        <Metric
          label="Check Status"
          value={isLoading ? "Scanning..." : (issues.length === 0 ? "Passed" : "Action Needed")}
          status={issues.length === 0 ? "positive" : "warning"}
        />
      </MetricStrip>

      <!-- Diagnostic Checks Grid -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
          Diagnostic Suite
        </h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {#each diagnosticChecks as check}
            <div class="flex items-start gap-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] p-3.5 shadow-sm">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--paisa-radius-sm)] bg-[var(--paisa-surface-2)] text-[var(--paisa-brand-primary)]">
                <i class={check.icon}></i>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[var(--paisa-text-primary)]">{check.title}</span>
                  <span class="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[var(--paisa-positive)]">
                    <i class="fas fa-check text-[0.625rem]"></i> Active
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-[var(--paisa-muted-foreground)]">
                  {check.desc}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Issues List (when issues exist) -->
      {#if issues.length > 0}
        <div>
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
            Detected Issues & Recommendations
          </h3>
          <div class="flex flex-col gap-3" data-testid="diagnosis-list">
            {#each issues as issue, index (`${issue.level}-${issue.summary}-${index}`)}
              <Card padding="md" class="border-l-4 border-l-[var(--paisa-{issue.level === 'danger' ? 'negative' : (issue.level === 'warning' ? 'warning' : 'primary')} )]">
                <div class="flex items-center justify-between gap-2 border-b border-[var(--paisa-border-subtle)] pb-2">
                  <div class="flex items-center gap-2">
                    <Badge variant={levelVariant(issue.level)} size="sm" class="uppercase">
                      {issue.level || "info"}
                    </Badge>
                    <h4 class="text-sm font-semibold text-[var(--paisa-text-primary)]">
                      {issue.summary}
                    </h4>
                  </div>
                </div>
                <div class="pt-2 text-xs text-[var(--paisa-text-secondary)]">
                  <div class="leading-relaxed">{@html issue.description}</div>
                  {#if issue.details}
                    <div class="mt-2 rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] p-2.5 font-mono text-[0.75rem] text-[var(--paisa-text-primary)]">
                      {@html issue.details}
                    </div>
                  {/if}
                </div>
              </Card>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </Section>
</Page>
