<script lang="ts">
import type { DtoInvestmentPerformance } from "$lib/api";
import { obscure } from "$lib/shared/state/persisted";
import Section from "$lib/shared/layout/Section.svelte";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { performancePercent } from "$lib/features/assets/performance";
let { summary, loading = false }: {
  summary?: DtoInvestmentPerformance | null;
  loading?: boolean;
} = $props();
</script>
<Section title="Investment Performance · Current FY">
  {#if loading}<p class="text-sm text-muted-foreground">Loading performance…</p>
  {:else if summary && summary.quality?.status !== "unavailable"}
    <div class="flex flex-wrap items-baseline gap-3"><span class="text-lg font-semibold tabular-nums">{formatCurrency($obscure ? 0 : summary.investmentReturn ?? 0)} investment return</span><span class="text-sm">{summary.periodReturn == null ? "Period return unavailable" : `${performancePercent($obscure ? 0 : summary.periodReturn)} period return`}</span></div>
    {#if summary.quality?.status === "partial"}<p class="text-sm text-muted-foreground">Partial data · amounts may be estimates.</p>{/if}
  {:else}<p class="text-sm text-muted-foreground">Performance unavailable</p>{/if}
  <a href="/assets/gain?preset=current_fy" class="mt-2 inline-block text-sm text-primary hover:underline">View Investment Performance</a>
</Section>
