<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    buildLegends,
    renderOverview,
    renderPerAccountOverview
  } from "$lib/charts/liabilities/interest";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let legends: Legend[] = $state([]);

  onMount(async () => {
    const { interest_timeline_breakdown: interests } = await ajax("/api/liabilities/interest");

    if (_.isEmpty(interests)) {
      isEmpty = true;
      return;
    }

    legends = buildLegends();
    renderOverview(interests);
    renderPerAccountOverview(interests);
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Interest Breakdown"
    description="Interest payments and rates across all liabilities"
  />

  {#if isEmpty}
    <Section>
      <article class="message">
        <div class="message-body">
          <strong>Hurray!</strong> You have no liabilities.
        </div>
      </article>
    </Section>
  {:else}
    <Section title="Interest Overview">
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame type="timeline">
        <svg id="d3-interest-overview" width="100%" />
      </ChartFrame>
    </Section>

    <Section>
      <div class="d3-interest-timeline-breakdown">
        <div id="d3-interest-timeline-breakdown"></div>
      </div>
    </Section>
  {/if}
</Page>
