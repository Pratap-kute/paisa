<script lang="ts">
  import type { CapitalGain } from "$lib/core/utils";
  import CapitalGainCard from "$lib/components/finance/CapitalGainCard.svelte";
  import { ajax } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let years: string[] = $state([]);
  let capitalGains: CapitalGain[] = $state([]);

  onMount(async () => {
    const { capital_gains: capital_gains } = await ajax("/api/capital_gains");

    years = _.chain(capital_gains)
      .values()
      .flatMap((c) => _.keys(c.fy))
      .uniq()
      .sort()
      .reverse()
      .value();

    capitalGains = _.values(capital_gains);
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Capital Gains"
    description="Financial year capital gains summary and asset realization"
  />

  <Section>
    <div class="paisa-capital-gains-list">
      {#each years as year}
        <CapitalGainCard financialYear={year} {capitalGains} />
      {/each}
    </div>
  </Section>
</Page>

<style lang="scss">
  .paisa-capital-gains-list {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }
</style>
