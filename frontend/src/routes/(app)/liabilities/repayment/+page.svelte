<script lang="ts">
  import LegendCard from "$lib/shared/ui/LegendCard.svelte";
  import { buildRepaymentSeries } from "$lib/features/charts/time_series_data";
  import { ajax, type Legend, type Posting } from "$lib/core/utils";
    import { onMount } from "svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import RepaymentTimelineChart from "$lib/features/liabilities/components/RepaymentTimelineChart.svelte";
import { isEmpty as isEmptyValue } from "$lib/shared/utils/collection";

  let isEmpty = $state(false);
  let isLoading = $state(true);
  let legends: Legend[] = $state([]);
  let repayments: Posting[] = $state([]);

  onMount(async () => {
    try {
      ({ repayments } = await ajax("/api/liabilities/repayment"));
      if (isEmptyValue(repayments)) {
        isEmpty = true;
        return;
      }

      legends = buildRepaymentSeries(repayments).legends ?? [];
      isLoading = false;
    } finally {
      isLoading = false;
    }
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
      <ChartFrame height="tall">
        <RepaymentTimelineChart {repayments} />
      </ChartFrame>
    {/if}
  </Section>
</Page>
