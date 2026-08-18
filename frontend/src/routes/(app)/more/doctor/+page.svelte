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
    <div class="has-text-centered mb-4">
      <b
        class="p-1 has-text-white"
        style="background-color: {issues.length > 0 ? COLORS.lossText : COLORS.gainText}"
        >{issues.length}</b
      > potential issue(s) found.
    </div>
    <div class="columns is-flex-wrap-wrap" id="d3-diagnosis"></div>
  </Section>
</Page>
