<script lang="ts">
  import { onMount } from "svelte";
  import COLORS from "$lib/core/colors";
  import { ajax } from "$lib/core/utils";
  import { renderIssues } from "$lib/charts/doctor";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let issues = $state([]);
  onMount(async () => {
    ({ issues } = await ajax("/api/diagnosis"));
    renderIssues(issues);
  });
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
        style="background-color: {issues.length > 0 ? COLORS.lossText : COLORS.gainText}"
        >{issues.length}</b
      >
      potential issue(s) found.
    </div>
    <div class="-m-2 flex flex-wrap" id="d3-diagnosis"></div>
  </Section>
</Page>
