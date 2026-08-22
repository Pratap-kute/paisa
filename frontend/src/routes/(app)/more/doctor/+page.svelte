<script lang="ts">
  import { onMount } from "svelte";
  import { ajax, type Issue } from "$lib/core/utils";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let issues: Issue[] = $state([]);
  onMount(async () => {
    ({ issues } = await ajax("/api/diagnosis"));
  });

  const levelClass: Record<string, string> = {
    warning: "issue-warning",
    danger: "issue-danger",
    info: "issue-info",
  };
</script>

<Page width="fluid">
  <PageHeader
    title="Doctor"
    description="Diagnostic checks for journal health and configuration issues"
  />

  <Section>
    <div class="mb-4 text-center text-sm text-[var(--paisa-muted-foreground)]">
      <b
        class="inline-block rounded-[var(--paisa-radius-sm)] px-2 py-0.5 text-white"
        class:status-danger={issues.length > 0}
        class:status-ok={issues.length === 0}
        >{issues.length}</b
      >
      potential issue(s) found.
    </div>
    {#if issues.length === 0}
      <p class="m-0 text-center text-sm text-[var(--paisa-muted-foreground)]">No journal or configuration issues were found.</p>
    {:else}
      <div class="-m-2 flex flex-wrap" data-testid="diagnosis-list">
        {#each issues as issue, index (`${issue.level}-${issue.summary}-${index}`)}
          <article class="w-full p-2 min-[769px]:w-1/2">
            <div class="issue {levelClass[issue.level] ?? levelClass.info}">
              <header><span class="severity">{issue.level || "info"}</span><h2>{issue.summary}</h2></header>
              <div class="issue-body"><p>{@html issue.description}</p>{#if issue.details}<div class="issue-details">{@html issue.details}</div>{/if}</div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </Section>
</Page>

<style>
  .status-danger { background-color: var(--paisa-negative); }
  .status-ok { background-color: var(--paisa-positive); }
  .issue { overflow: hidden; border: 1px solid color-mix(in srgb, var(--issue-color) 20%, transparent); border-radius: var(--paisa-radius-md); background: var(--issue-bg); }
  .issue header { display: flex; align-items: center; gap: .5rem; padding: .5rem 1rem; border-bottom: 1px solid color-mix(in srgb, var(--issue-color) 20%, transparent); background: color-mix(in srgb, var(--issue-color) 10%, transparent); }
  .issue h2 { margin: 0; font-size: var(--paisa-font-size-sm); font-weight: var(--paisa-font-weight-semibold); color: var(--paisa-foreground); }
  .severity { font-size: .6875rem; font-weight: 700; text-transform: uppercase; color: var(--issue-color); }
  .issue-body { padding: .75rem 1rem; font-size: var(--paisa-font-size-sm); color: var(--paisa-foreground); }
  .issue-body p { margin: 0; }
  .issue-details { margin-top: .75rem; }
  .issue-warning { --issue-color: var(--paisa-warning); --issue-bg: var(--paisa-warning-subtle); }
  .issue-danger { --issue-color: var(--paisa-negative); --issue-bg: var(--paisa-negative-subtle); }
  .issue-info { --issue-color: var(--paisa-primary); --issue-bg: var(--paisa-primary-subtle); }
</style>
