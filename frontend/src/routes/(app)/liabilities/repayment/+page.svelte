<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { renderMonthlyRepaymentTimeline } from "$lib/charts/repayment";
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
    const { repayments: repayments } = await ajax("/api/liabilities/repayment");
    if (_.isEmpty(repayments)) {
      isEmpty = true;
    } else {
      legends = renderMonthlyRepaymentTimeline(repayments);
    }
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Repayment Timeline"
    description="Monthly liability repayments and debt reduction"
  />

  {#if isEmpty}
    <Section>
      <article class="message">
        <div class="message-body">You haven't repaid any liabilities.</div>
      </article>
    </Section>
  {:else}
    <Section title="Monthly Repayments">
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame type="timeline">
        <svg id="d3-repayment-timeline" width="100%" height="500" />
      </ChartFrame>
    </Section>
  {/if}
</Page>
