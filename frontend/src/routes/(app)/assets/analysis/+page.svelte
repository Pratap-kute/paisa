<script lang="ts">
  import { run } from 'svelte/legacy';

  import { generateColorScheme, genericBarColor } from "$lib/core/colors";
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { filterCommodityBreakdowns, renderPortfolioBreakdown } from "$lib/charts/portfolio";
  import { ajax, type PortfolioAggregate } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";

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
    securityTypeR = renderPortfolioBreakdown("#d3-portfolio-security-type", security_type);
    ratingR = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating);
    industryR = renderPortfolioBreakdown("#d3-portfolio-security-industry", industry, {
      z: [genericBarColor()]
    });
    portfolioR = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type);
    color = generateColorScheme(commodities);
  });

  run(() => {
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

<section class="section tab-interest" class:is-hidden={!isEmpty}>
  <div class="container is-fluid">
    <div class="columns is-centered">
      <div class="column is-4 has-text-centered">
        <article class="message">
          <div class="message-body">
            <strong>Oops!</strong> Looks like mutual fund portfolio data is not available<br /><br
            />
            Use the <strong>Update Mutual Fund Portfolios</strong> menu option at the right corner to
            update the data.
          </div>
        </article>
      </div>
    </div>
  </div>
</section>

<section class="section tab-portfolio" class:is-hidden={isEmpty}>
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-12 is-flex">
        {#each commodities as commodity}
          {@const name = `switch-${commodity}`}
          <div class="field mr-5 color-switch" style="--color: {color ? color(commodity) : ''}">
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
    </div>
    <div class="columns">
      <div class="column is-12 has-text-centered">
        <div class="box paisa-overflow-x-auto">
          <div id="d3-portfolio-security-type-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-type" />
        </div>
      </div>
    </div>
    <BoxLabel text="Security Type" />

    <div class="columns">
      <div class="column is-12 has-text-centered">
        <div class="box paisa-overflow-x-auto">
          <div id="d3-portfolio-security-rating-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-rating" />
        </div>
      </div>
    </div>
    <BoxLabel text="Security Rating" />

    <div class="columns">
      <div class="column is-12 has-text-centered">
        <div class="box paisa-overflow-x-auto">
          <div
            id="d3-portfolio-security-industry-treemap"
            style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-industry" />
        </div>
      </div>
    </div>
    <BoxLabel text="Industry" />

    <div class="columns">
      <div class="column is-12 has-text-centered">
        <div class="box paisa-overflow-x-auto">
          {#if portfolioR}
            <LegendCard legends={portfolioR.legends} clazz="ml-4" />
          {/if}
          <div id="d3-portfolio-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio" />
        </div>
      </div>
    </div>
    <BoxLabel text="Security" />
  </div>
</section>

<style lang="scss">
  .color-switch {
    .switch[type="checkbox"]:checked + label::before,
    .switch[type="checkbox"]:checked + label:before {
      background: var(--color);
    }
  }
</style>
