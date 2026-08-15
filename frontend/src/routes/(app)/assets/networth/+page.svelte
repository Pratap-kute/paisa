<script lang="ts">
  import {
    ajax,
    formatCurrency,
    formatFloat,
    isMobile,
    type Legend,
    type Networth
  } from "$lib/core/utils";
  import COLORS from "$lib/core/colors";
  import { renderNetworth } from "$lib/charts/networth";
  import _ from "lodash";
  import { onMount } from "svelte";
  import { dateRange, setAllowedDateRange } from "../../../../store";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";

  let networth = $state(0);
  let investment = $state(0);
  let gain = $state(0);
  let xirr = $state(0);
  let svg: Element = $state();
  let points: Networth[] = $state([]);
  let legends: Legend[] = $state([]);

  $effect(() => {
    if (!_.isEmpty(points) && svg) {
      const res = renderNetworth(
        _.filter(
          points,
          (p) => p.date.isSameOrBefore($dateRange.to) && p.date.isSameOrAfter($dateRange.from)
        ),
        svg
      );
      legends = res.legends;
      return () => {
        res.destroy?.();
      };
    }
  });

  onMount(async () => {
    const result = await ajax("/api/networth");
    points = result.networthTimeline;
    setAllowedDateRange(_.map(points, (p) => p.date));

    const current = _.last(points);
    if (current) {
      networth = current.investmentAmount + current.gainAmount - current.withdrawalAmount;
      investment = current.investmentAmount - current.withdrawalAmount;
      gain = current.gainAmount;
    }
    xirr = result.xirr;
  });
</script>

<section class="section tab-networth">
  <div class="container is-fluid">
    <div class="columns is-multiline is-variable is-2-desktop">
      <div class="column is-12">
        <nav class="level {isMobile() && 'grid-2'}">
      <LevelItem title="Net worth" color={COLORS.primary} value={formatCurrency(networth)} />
      <LevelItem
        title="Net Investment"
        color={COLORS.secondary}
        value={formatCurrency(investment)}
      />
      <LevelItem
        title="Gain / Loss"
        color={gain >= 0 ? COLORS.gainText : COLORS.lossText}
        value={formatCurrency(gain)}
      />
      <LevelItem title="XIRR" value={formatFloat(xirr)} />
    </nav>
      </div>
    </div>
  </div>
</section>

<section class="section tab-networth">
  <div class="container is-fluid">
    <div class="columns is-multiline">
      <div class="column is-12">
        <div class="box paisa-overflow-x-auto">
          <ZeroState item={points}>
            <strong>Oops!</strong> You have no transactions.
          </ZeroState>

          <LegendCard {legends} clazz="ml-4" />
          <svg id="d3-networth-timeline" height="500" bind:this={svg} />
        </div>
      </div>
    </div>
    <BoxLabel text="Networth Timeline" />
  </div>
</section>
