<script lang="ts">
  import { buildGoalProgressSeries } from "$lib/charts/time_series_data";
  import type { Forecast, Point } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    points: Point[];
    predictions: Forecast[];
    breakPoints: Point[];
    targetSavings: number;
    testId: string;
    ariaLabel: string;
  }

  let { points, predictions, breakPoints, targetSavings, testId, ariaLabel }: Props = $props();
  const data = $derived(buildGoalProgressSeries(points, predictions, breakPoints, targetSavings));
</script>

<TimeSeriesChart {data} {ariaLabel} {testId} internalLegend />
