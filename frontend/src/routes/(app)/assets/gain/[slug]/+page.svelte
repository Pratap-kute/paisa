<script lang="ts">
import COLORS from "$lib/shared/theme/colors";
import type { Networth } from "$lib/domain/assets";
import { formatCurrency, formatFloat } from "$lib/shared/formatters/currency";
import { formatPercentage } from "$lib/shared/formatters/currency";
import { formatFloatUptoPrecision } from "$lib/shared/formatters/currency";
import { firstName, restName } from "$lib/domain/account";
import { postingUrl } from "$lib/shared/browser/navigation";
import type { AccountGain, PortfolioAggregate } from "$lib/domain/assets";
import type { AssetBreakdown } from "$lib/domain/assets";
import { buildLegends } from "$lib/features/assets/gain";
import {
  buildPortfolioComparison,
  filterCommodityBreakdowns,
} from "$lib/features/assets/hierarchy_data";
import type { Posting } from "$lib/domain/ledger";
import { api } from "$lib/api";
import { last, sortBy } from "es-toolkit";
import { onMount } from "svelte";
import type { PageData } from "./$types";

import { iconify } from "$lib/shared/ui/icon";
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import GainAccountTimelineChart from "$lib/features/assets/components/GainAccountTimelineChart.svelte";
import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";

let commodities: string[] = [];
let selectedCommodities: string[] = $state([]);
let security_type: PortfolioAggregate[] = $state([]);
let name_and_security_type: PortfolioAggregate[] = $state([]);
let rating: PortfolioAggregate[] = $state([]);
let industry: PortfolioAggregate[] = $state([]);
let securityTypeData = $derived(
  buildPortfolioComparison(
    filterCommodityBreakdowns(security_type, selectedCommodities),
  ),
);
let ratingData = $derived(
  buildPortfolioComparison(
    filterCommodityBreakdowns(rating, selectedCommodities),
  ),
);
let industryData = $derived(
  buildPortfolioComparison(
    filterCommodityBreakdowns(industry, selectedCommodities),
  ),
);
let portfolioData = $derived(
  buildPortfolioComparison(
    filterCommodityBreakdowns(name_and_security_type, selectedCommodities),
  ),
);

let securityTypeEmpty: boolean = $state(false);
let nameAndSecurityTypeEmpty: boolean = $state(false);
let ratingEmpty: boolean = $state(false);
let industryEmpty: boolean = $state(false);

interface Props {
  data: PageData;
}

let { data }: Props = $props();
let gain: AccountGain | undefined = $state();
let overview: Networth | undefined = $state();
let assetBreakdown: AssetBreakdown | undefined = $state();
let legends = buildLegends();

let postings: Posting[] = $state([]);

onMount(async () => {
  const res = await api.gain.getAccountGain(data.name);
  gain = res.gain_timeline_breakdown as unknown as AccountGain;
  assetBreakdown = res.asset_breakdown as unknown as AssetBreakdown;
  name_and_security_type = (res.portfolio_allocation
    ?.name_and_security_type as unknown as PortfolioAggregate[]) || [];
  security_type = (res.portfolio_allocation
    ?.security_type as unknown as PortfolioAggregate[]) || [];
  rating =
    (res.portfolio_allocation?.rating as unknown as PortfolioAggregate[]) || [];
  industry =
    (res.portfolio_allocation?.industry as unknown as PortfolioAggregate[]) ||
    [];
  commodities = (res.portfolio_allocation?.commodities as unknown as any) || [];

  overview = last(gain.networthTimeline as any);
  postings = [...(gain.postings || [])]
    .sort((a, b) => {
      const da = a.date
        ? (typeof a.date === "string"
          ? new Date(a.date).getTime()
          : (a.date as any).valueOf())
        : 0;
      const db = b.date
        ? (typeof b.date === "string"
          ? new Date(b.date).getTime()
          : (b.date as any).valueOf())
        : 0;
      return db - da;
    })
    .slice(0, 100) as unknown as Posting[];
  selectedCommodities = [...commodities];
  securityTypeEmpty = security_type.length === 0;
  nameAndSecurityTypeEmpty = name_and_security_type.length === 0;
  ratingEmpty = rating.length === 0;
  industryEmpty = industry.length === 0;
});
</script>

<svelte:head>
  <title>{data.name || "Asset Gain"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title={data.name || "Asset Gain"}
    description="Lot-by-lot gain, performance timeline, and transaction history"
  >
    {#snippet leading()}
      <a
        href="/assets/gain"
        class="inline-flex items-center gap-1 text-sm text-[var(--paisa-muted-foreground)] transition-colors hover:text-[var(--paisa-foreground)]"
      >
        <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
        <span>Gain</span>
      </a>
    {/snippet}
  </PageHeader>

  {#if overview}
    <MetricStrip cols={4}>
      <Metric label="Balance" value={formatCurrency(overview.balanceAmount)} />
      <Metric
        label="Net Investment"
        value={formatCurrency(overview.netInvestmentAmount)}
      />
      <Metric
        label="Gain / Loss"
        value={formatCurrency(overview.gainAmount)}
        status={overview.gainAmount >= 0 ? "positive" : "negative"}
      />
      <Metric
        label="XIRR"
        value={formatFloat(gain?.xirr ?? 0)}
        secondary={assetBreakdown
          ? `${formatPercentage(assetBreakdown.absoluteReturn, 2)} absolute return`
          : undefined}
      />
    </MetricStrip>
  {/if}

  <div class="grid w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
    <div class="flex min-w-0 flex-col gap-4">
      <Section title="Postings">
        <div
          class="flex max-h-[min(720px,calc(100vh-300px))] min-h-[280px] flex-col gap-2 overflow-y-auto pr-1 max-lg:max-h-[400px] max-lg:min-h-0"
        >
          {#each postings as posting}
            <a
              class="paisa-posting-row flex min-h-[54px] flex-col gap-1 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] px-3 py-2 text-[var(--paisa-text-secondary)] no-underline transition-colors hover:border-[var(--paisa-border-strong)] hover:text-[var(--paisa-text-primary)]"
              href={postingUrl(posting)}
              style="border-left: 2px solid {posting.amount >= 0
                ? posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.loss
                  : COLORS.secondary
                : posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.gain
                  : COLORS.tertiary}"
            >
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--paisa-text-secondary)]"
                  >{posting.payee}</span
                >
                <span
                  class="shrink-0 text-xs text-[var(--paisa-text-muted)]"
                  >{posting.date.format("DD MMM YYYY")}</span
                >
              </span>
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span
                  class="custom-icon min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--paisa-text-muted)]"
                >
                  {iconify(restName(posting.account), {
                    group: firstName(posting.account),
                  })}
                </span>
                <span
                  class="shrink-0 font-semibold tabular-nums text-[var(--paisa-text-primary)]"
                  >{formatCurrency(posting.amount)}</span
                >
              </span>
            </a>
          {/each}
        </div>
      </Section>
    </div>

    <div class="flex min-w-0 flex-col gap-4">
      {#if overview}
        <Section>
          <div
            class="flex flex-wrap items-center gap-4 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] px-4 py-3"
          >
            <span class="custom-icon text-xl">{iconify(data.name)}</span>
            <div class="flex items-baseline gap-2">
              <span class="text-xs text-[var(--paisa-text-muted)]"
                >Investment</span
              >
              <span class="font-semibold tabular-nums text-[var(--paisa-foreground)]"
                >{formatCurrency(overview.investmentAmount)}</span
              >
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-xs text-[var(--paisa-text-muted)]"
                >Withdrawal</span
              >
              <span class="font-semibold tabular-nums text-[var(--paisa-foreground)]"
                >{formatCurrency(overview.withdrawalAmount)}</span
              >
            </div>
            {#if overview.balanceUnits > 0}
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-[var(--paisa-text-muted)]"
                  >Balance Units</span
                >
                <span class="font-semibold tabular-nums text-[var(--paisa-foreground)]"
                  >{formatFloatUptoPrecision(overview.balanceUnits, 4)}</span
                >
              </div>
            {/if}
          </div>
        </Section>
      {/if}

      <Section title="Timeline">
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame height="tall">
          {#if gain}
            <GainAccountTimelineChart points={gain.networthTimeline} />
          {/if}
        </ChartFrame>
      </Section>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-4">
          {#if !securityTypeEmpty}
            <Section title="Security Type">
              <ChartFrame height="compact" rows={Math.max(4, securityTypeData.points.length)}>
                <ComparisonBarChart data={securityTypeData} ariaLabel="Asset security type breakdown" testId="gain-security-type-echart" />
              </ChartFrame>
            </Section>
          {/if}

          {#if !ratingEmpty}
            <Section title="Security Rating">
              <ChartFrame height="compact" rows={Math.max(4, ratingData.points.length)}>
                <ComparisonBarChart data={ratingData} ariaLabel="Asset security rating breakdown" testId="gain-security-rating-echart" />
              </ChartFrame>
            </Section>
          {/if}

          {#if !industryEmpty}
            <Section title="Industry">
              <ChartFrame height="compact" rows={Math.max(4, industryData.points.length)}>
                <ComparisonBarChart data={industryData} ariaLabel="Asset industry breakdown" testId="gain-industry-echart" />
              </ChartFrame>
            </Section>
          {/if}
        </div>

        {#if !nameAndSecurityTypeEmpty}
          <div class="min-w-0">
            <Section title="Security">
              <ChartFrame height="compact" rows={Math.max(4, portfolioData.points.length)}>
                <ComparisonBarChart data={portfolioData} ariaLabel="Asset security breakdown" testId="gain-security-echart" />
              </ChartFrame>
            </Section>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Page>
