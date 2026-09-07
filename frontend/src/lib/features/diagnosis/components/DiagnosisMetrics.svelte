<script lang="ts">
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";

interface Props {
  dangerCount?: number;
  warningCount?: number;
  infoCount?: number;
  passedChecks?: number;
  totalChecks?: number;
  loading?: boolean;
}

let {
  dangerCount = 0,
  warningCount = 0,
  infoCount = 0,
  passedChecks = 0,
  totalChecks = 0,
  loading = false,
}: Props = $props();
</script>

<MetricStrip cols="auto" class="!mb-0">
  <Metric
    label="Critical"
    value={String(dangerCount)}
    status={dangerCount === 0 ? "neutral" : "negative"}
    {loading}
  />
  <Metric
    label="Warnings"
    value={String(warningCount)}
    status={warningCount === 0 ? "neutral" : "warning"}
    {loading}
  />
  <Metric
    label="Information"
    value={String(infoCount)}
    status="neutral"
    {loading}
  />
  <Metric
    label="Checks Passed"
    value={totalChecks > 0 ? `${passedChecks}/${totalChecks}` : (loading ? "..." : "11/11")}
    status={passedChecks === totalChecks && totalChecks > 0 ? "positive" : "neutral"}
    {loading}
  />
</MetricStrip>
