<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { renderMonthlyRepaymentTimeline } from "$lib/charts/repayment";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);
  let legends: Legend[] = $state([]);
  let repaymentChart: ChartHandle<null> | null = $state(null);

  onMount(async () => {
    try {
      const { repayments: repayments } = await ajax("/api/liabilities/repayment");
      if (_.isEmpty(repayments)) {
        isEmpty = true;
        return;
      }

      isLoading = false;
      await tick();
      repaymentChart = createClientWidthChart("#d3-repayment-timeline", (_data, _size) => {
        legends = renderMonthlyRepaymentTimeline(repayments);
      });
      repaymentChart.update(null);
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    repaymentChart?.destroy();
  });
</script>

<svelte:head>
  <title>Repayment Timeline - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Repayment Timeline"
    description="Monthly liability repayments and debt reduction"
  />

  <Section title="Monthly Repayments">
    {#if isLoading}
      <div
        class="flex min-h-[200px] items-center justify-center rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]"
        aria-hidden="true"
      >
        <div class="h-8 w-8 animate-pulse rounded-full bg-[var(--paisa-surface-hover)]"></div>
      </div>
    {:else if isEmpty}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          You haven't repaid any liabilities.
        </p>
      </ZeroState>
    {:else}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame type="timeline" onresize={(dim) => repaymentChart?.resize(dim)}>
        <svg id="d3-repayment-timeline" width="100%" height="500" />
      </ChartFrame>
    {/if}
  </Section>
</Page>
