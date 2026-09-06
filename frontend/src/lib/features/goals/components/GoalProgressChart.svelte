<script lang="ts">
import type { Point } from "$lib/domain/goals_models";
import {
  buildGoalProgressSeries,
  type GoalProjectionKind,
} from "$lib/features/goals/time_series_data";
import type { Forecast } from "$lib/domain/goals_models";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

interface Props {
  projectionKind?: GoalProjectionKind;
  points: Point[];
  predictions: Forecast[];
  breakPoints: Point[];
  targetSavings: number;
  testId: string;
  ariaLabel: string;
}

let {
  projectionKind = "forecast",
  points,
  predictions,
  breakPoints,
  targetSavings,
  testId,
  ariaLabel,
}: Props = $props();
const data = $derived(
  buildGoalProgressSeries(
    points,
    predictions,
    breakPoints,
    targetSavings,
    projectionKind,
  ),
);
</script>

<TimeSeriesChart {data} {ariaLabel} {testId} internalLegend />
