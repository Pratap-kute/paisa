<script lang="ts">
import type { Point } from "$lib/domain/goals_models";
import { buildGoalProgressSeries } from "$lib/features/goals/time_series_data";
import type { Forecast } from "$lib/domain/goals_models";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

interface Props {
  points: Point[];
  predictions: Forecast[];
  breakPoints: Point[];
  targetSavings: number;
  testId: string;
  ariaLabel: string;
}

let { points, predictions, breakPoints, targetSavings, testId, ariaLabel }:
  Props = $props();
const data = $derived(
  buildGoalProgressSeries(points, predictions, breakPoints, targetSavings),
);
</script>

<TimeSeriesChart {data} {ariaLabel} {testId} internalLegend />
