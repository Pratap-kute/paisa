<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    buildLegends,
    renderOverview,
    renderPerAccountOverview
  } from "$lib/charts/liabilities/interest";
  import { ajax, type Interest, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let legends: Legend[] = $state([]);

  function hasLiabilityActivity(interests: Interest[]) {
    return _.some(interests, (interest) =>
      !_.isEmpty(interest.overview_timeline) &&
      _.some(interest.overview_timeline, (point) =>
        point.drawn_amount !== 0 ||
        point.interest_amount !== 0 ||
        point.repaid_amount !== 0
      )
    );
  }

  onMount(async () => {
    const { interest_timeline_breakdown: interests } = await ajax("/api/liabilities/interest");

    if (!hasLiabilityActivity(interests)) {
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

  <Section title="Interest Overview">
    {#if !isEmpty}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}
    <ChartFrame
      type="dynamic"
      empty={isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
    >
      <svg id="d3-interest-overview" width="100%" />
    </ChartFrame>
  </Section>

  <Section title="Per-Account Breakdown">
    <ChartFrame
      type="dynamic"
      empty={isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
    >
      <div class="d3-interest-timeline-breakdown">
        <div id="d3-interest-timeline-breakdown"></div>
      </div>
    </ChartFrame>
  </Section>
</Page>
