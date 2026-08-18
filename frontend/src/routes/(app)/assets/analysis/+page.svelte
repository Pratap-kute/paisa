<script lang="ts">
  import { generateColorScheme, genericBarColor } from "$lib/core/colors";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { filterCommodityBreakdowns, renderPortfolioBreakdown } from "$lib/charts/portfolio";
  import { ajax, type PortfolioAggregate } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";

  let commodities: string[] = $state([]);
  let selectedCommodities: string[] = $state([]);
  let security_type: PortfolioAggregate[] = $state([]);
  let name_and_security_type: PortfolioAggregate[] = $state([]);
  let rating: PortfolioAggregate[] = $state([]);
  let industry: PortfolioAggregate[] = $state([]);
  let isEmpty = $state(false);
  let color: any = $state();

  let securityTypeR: any = $state(),
    portfolioR: any = $state(),
    industryR: any = $state(),
    ratingR: any = $state(null);

  onMount(async () => {
    ({ name_and_security_type, security_type, rating, industry, commodities } = await ajax(
      "/api/portfolio_allocation"
    ));

    if (_.isEmpty(commodities)) {
      isEmpty = true;
      return;
    } else {
      isEmpty = false;
    }

    selectedCommodities = [...commodities];
    securityTypeR = renderPortfolioBreakdown("#d3-portfolio-security-type", security_type, { small: true });
    ratingR = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating, { small: true });
    industryR = renderPortfolioBreakdown("#d3-portfolio-security-industry", industry, {
      z: [genericBarColor()]
    });
    portfolioR = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type);
    color = generateColorScheme(commodities);
  });

  $effect(() => {
    if (securityTypeR && ratingR && industryR && portfolioR && color) {
      securityTypeR.renderer(filterCommodityBreakdowns(security_type, selectedCommodities), color);
      ratingR.renderer(filterCommodityBreakdowns(rating, selectedCommodities), color);
      industryR.renderer(filterCommodityBreakdowns(industry, selectedCommodities), color);
      portfolioR.renderer(
        filterCommodityBreakdowns(name_and_security_type, selectedCommodities),
        color
      );
    }
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Portfolio Analysis"
    description="Breakdown by security type, rating, industry, and individual holdings"
  />

  {#if isEmpty}
    <Section>
      <article class="message">
        <div class="message-body">
          <strong>Oops!</strong> Looks like mutual fund portfolio data is not available<br /><br />
          Use the <strong>Update Mutual Fund Portfolios</strong> menu option at the right corner to
          update the data.
        </div>
      </article>
    </Section>
  {:else}
    <Section>
      <div class="paisa-commodity-switches">
        {#each commodities as commodity}
          {@const name = `switch-${commodity}`}
          <div class="field color-switch" style="--color: {color ? color(commodity) : ''}">
            <input
              id={name}
              type="checkbox"
              bind:group={selectedCommodities}
              name="commodities"
              class="switch is-rounded"
              value={commodity}
            />
            <label for={name}>{commodity}</label>
          </div>
        {/each}
      </div>
    </Section>

    <!-- Side-by-Side Summary: Security Type & Security Rating -->
    <ResponsiveGrid variant="two-column">
      <Section title="Security Type">
        <ChartFrame type="dynamic" onresize={() => {
          document.getElementById("d3-portfolio-security-type")?.replaceChildren();
          securityTypeR = renderPortfolioBreakdown("#d3-portfolio-security-type", security_type, { small: true });
        }}>
          <div id="d3-portfolio-security-type-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-type" />
        </ChartFrame>
      </Section>

      <Section title="Security Rating">
        <ChartFrame type="dynamic" onresize={() => {
          document.getElementById("d3-portfolio-security-rating")?.replaceChildren();
          ratingR = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating, { small: true });
        }}>
          <div id="d3-portfolio-security-rating-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-rating" />
        </ChartFrame>
      </Section>
    </ResponsiveGrid>

    <Section title="Industry">
      <ChartFrame type="dynamic" onresize={() => {
        document.getElementById("d3-portfolio-security-industry")?.replaceChildren();
        industryR = renderPortfolioBreakdown("#d3-portfolio-security-industry", industry, {
          z: [genericBarColor()]
        });
      }}>
        <div id="d3-portfolio-security-industry-treemap" style="width: 100%; position: relative"></div>
        <svg id="d3-portfolio-security-industry" />
      </ChartFrame>
    </Section>

    <Section title="Holdings">
      {#if portfolioR}
        <LegendCard legends={portfolioR.legends} clazz="mb-3 paisa-overflow-x-auto" />
      {/if}
      <ChartFrame type="dynamic" onresize={() => {
        document.getElementById("d3-portfolio")?.replaceChildren();
        portfolioR = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type);
      }}>
        <div id="d3-portfolio-treemap" style="width: 100%; position: relative"></div>
        <svg id="d3-portfolio" />
      </ChartFrame>
    </Section>
  {/if}
</Page>

<style lang="scss">
  .paisa-commodity-switches {
    display: flex;
    flex-wrap: wrap;
    gap: var(--paisa-space-3);
  }

  .color-switch {
    margin-bottom: 0;
    .switch[type="checkbox"]:checked + label::before,
    .switch[type="checkbox"]:checked + label:before {
      background: var(--color);
    }
  }
</style>
