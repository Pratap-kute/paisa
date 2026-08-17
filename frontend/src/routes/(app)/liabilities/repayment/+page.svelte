<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { renderMonthlyRepaymentTimeline } from "$lib/charts/repayment";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let legends: Legend[] = $state([]);
  let repaymentChart: ChartHandle<null> | null = $state(null);

  onMount(async () => {
    const { repayments: repayments } = await ajax("/api/liabilities/repayment");
    if (_.isEmpty(repayments)) {
      isEmpty = true;
    } else {
      repaymentChart = createClientWidthChart("#d3-repayment-timeline", () => {
        legends = renderMonthlyRepaymentTimeline(repayments);
      });
      repaymentChart.update(null);
    }
  });

  onDestroy(() => {
    repaymentChart?.destroy();
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
      <ChartFrame type="timeline" onresize={(dim) => repaymentChart?.resize(dim)}>
        <svg id="d3-repayment-timeline" width="100%" height="500" />
      </ChartFrame>
    </Section>
  {/if}
</Page>
