import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  createInterestOverviewChart,
  createInterestPerAccountChart,
  maxOverviewY,
  renderPerAccountOverview,
  timelineDomain,
} from "$lib/charts/liabilities/interest";
import type { Interest } from "$lib/core/utils";
import fixture from "../fixture/browser/liabilities_interest.json" with { type: "json" };

function parseInterests(): Interest[] {
  return (fixture.interest_timeline_breakdown ?? []).map((item) => ({
    ...item,
    overview_timeline: item.overview_timeline.map((point) => ({
      ...point,
      date: dayjs(point.date.substring(0, 19)),
    })),
  }));
}

describe("interest chart resize", () => {
  it("overview chart assigns distinct y positions per account", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div class="paisa-interest-overview-chart" style="width:800px">
          <svg id="d3-interest-overview"></svg>
        </div>
      </div>`;
    const interests = parseInterests();
    const chart = createInterestOverviewChart();
    chart.update(interests);
    chart.resize({ width: 800, height: 400 });
    const svg = document.querySelector("#d3-interest-overview");
    const yPositions = Array.from(svg?.querySelectorAll(".group") ?? []).map(
      (group) => group.getAttribute("transform"),
    );
    expect(new Set(yPositions).size).toBe(interests.length);
    expect(Number(svg?.getAttribute("height"))).toBeGreaterThan(
      interests.length * 30,
    );
    expect(svg?.style.width).toMatch(/px$/);
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThanOrEqual(1270);
  });

  it("overview chart svg fits plot width when container is narrower than minWidth", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div class="paisa-interest-overview-chart" style="width:800px">
          <svg id="d3-interest-overview"></svg>
        </div>
      </div>`;
    const interests = parseInterests();
    const chart = createInterestOverviewChart();
    chart.update(interests);
    chart.resize({ width: 800, height: 400 });
    const svg = document.querySelector("#d3-interest-overview");
    const plotRight = 150 + 1100;
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThanOrEqual(
      plotRight + 20,
    );
  });

  it("overview chart keeps one root group after resize redraws", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div class="paisa-interest-overview-chart" style="width:800px">
          <svg id="d3-interest-overview"></svg>
        </div>
      </div>`;
    const interests = parseInterests();
    const chart = createInterestOverviewChart();
    chart.update(interests);
    chart.resize({ width: 800, height: 200 });
    chart.resize({ width: 600, height: 200 });
    const svg = document.querySelector("#d3-interest-overview");
    expect(svg?.querySelectorAll(":scope > g").length).toBe(1);
    expect(Number(svg?.getAttribute("height"))).toBeGreaterThan(0);
  });

  it("per-account chart ignores frame resize to avoid redraw loops", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div id="d3-interest-timeline-breakdown" style="width:800px"></div>
      </div>`;
    const interests = parseInterests();
    const chart = createInterestPerAccountChart();
    chart.update(interests);
    const widthBeforeResize = Number(
      document.querySelector(".paisa-interest-chart-card svg")?.getAttribute(
        "width",
      ),
    );
    chart.resize({ width: 800, height: 600 });
    chart.resize({ width: 600, height: 600 });
    const root = document.querySelector("#d3-interest-timeline-breakdown");
    const rows = root?.querySelectorAll(":scope > .paisa-interest-account-row");
    expect(rows?.length).toBe(interests.length);
    const svgs = root?.querySelectorAll(".paisa-interest-chart-card svg");
    for (const svg of svgs ?? []) {
      expect(Number(svg.getAttribute("width"))).toBe(widthBeforeResize);
      expect(Number(svg.getAttribute("width"))).toBeGreaterThan(0);
    }
  });

  it("per-account rerender without clear keeps one row per account", () => {
    document.body.innerHTML =
      `<div id="d3-interest-timeline-breakdown" style="width:800px"></div>`;
    const interests = parseInterests();
    renderPerAccountOverview(interests);
    renderPerAccountOverview(interests);
    const root = document.querySelector("#d3-interest-timeline-breakdown");
    const rows = root?.querySelectorAll(":scope > .paisa-interest-account-row");
    expect(rows?.length).toBe(interests.length);
  });

  it("maxOverviewY includes repaid and balance values", () => {
    const interests = parseInterests();
    const homeloan = interests.find((i) => i.account.includes("HomeLoan"));
    expect(homeloan).toBeTruthy();
    const maxY = maxOverviewY(homeloan!.overview_timeline);
    const peakRepaid = Math.max(
      ...homeloan!.overview_timeline.map((p) => p.repaid_amount),
    );
    expect(maxY).toBeGreaterThanOrEqual(peakRepaid);
  });

  it("overview headers sit in separate columns instead of overlapping", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div class="paisa-interest-overview-chart" style="width:800px">
          <svg id="d3-interest-overview"></svg>
        </div>
      </div>`;
    const chart = createInterestOverviewChart();
    chart.update(parseInterests());
    chart.resize({ width: 800, height: 400 });
    const svg = document.querySelector("#d3-interest-overview");
    const headerX = (label: string) => {
      const node = Array.from(svg?.querySelectorAll("text") ?? []).find(
        (text) => text.textContent === label,
      );
      return Number(node?.getAttribute("x"));
    };
    const loanDrawn = headerX("Loan Drawn");
    const interest = headerX("Interest");
    const repaid = headerX("Balance / Repaid");
    expect(interest - loanDrawn).toBeGreaterThanOrEqual(110);
    expect(repaid - interest).toBeGreaterThanOrEqual(110);
  });

  it("per-account summary and chart cards share the same row height", () => {
    document.body.innerHTML =
      `<div id="d3-interest-timeline-breakdown" style="width:800px"></div>`;
    renderPerAccountOverview(parseInterests());
    const rows = document.querySelectorAll(".paisa-interest-account-row");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const summary = row.querySelector(".paisa-interest-summary-card");
      const chart = row.querySelector(".paisa-interest-chart-card");
      expect(summary).toBeTruthy();
      expect(chart).toBeTruthy();
      const summaryHeight = summary!.getBoundingClientRect().height;
      const chartHeight = chart!.getBoundingClientRect().height;
      expect(Math.abs(summaryHeight - chartHeight)).toBeLessThanOrEqual(2);
    }
  });

  it("uses each account's own date domain instead of a shared timeline", () => {
    const chit: Interest = {
      account: "Liabilities:Chit",
      apr: 12,
      overview_timeline: [
        {
          date: dayjs("2016-06-01"),
          drawn_amount: 100000,
          repaid_amount: 0,
          interest_amount: 1000,
        },
        {
          date: dayjs("2017-01-01"),
          drawn_amount: 100000,
          repaid_amount: 20000,
          interest_amount: 4000,
        },
      ],
    };
    const homeloan: Interest = {
      account: "Liabilities:HomeLoan",
      apr: 8,
      overview_timeline: [
        {
          date: dayjs("2014-01-01"),
          drawn_amount: 2500000,
          repaid_amount: 0,
          interest_amount: 0,
        },
        {
          date: dayjs("2025-01-01"),
          drawn_amount: 2500000,
          repaid_amount: 1162491,
          interest_amount: 500000,
        },
      ],
    };
    const chitDomain = timelineDomain(chit.overview_timeline);
    const loanDomain = timelineDomain(homeloan.overview_timeline);
    expect(chitDomain?.[0].year()).toBe(2016);
    expect(chitDomain?.[1].year()).toBe(2017);
    expect(loanDomain?.[0].year()).toBe(2014);
    expect(loanDomain?.[1].year()).toBe(2025);
    expect(chitDomain?.[1].diff(chitDomain[0], "year", true)).toBeLessThan(2);

    document.body.innerHTML =
      `<div id="d3-interest-timeline-breakdown" style="width:800px"></div>`;
    renderPerAccountOverview([chit, homeloan]);
    const rows = document.querySelectorAll(".paisa-interest-account-row");
    expect(rows.length).toBe(2);
    const chitTicks = Array.from(
      rows[0].querySelectorAll(".axis.x text"),
    ).map((tick) => tick.textContent ?? "");
    expect(chitTicks.some((tick) => tick.includes("2014"))).toBe(false);
    expect(chitTicks.some((tick) => tick.includes("2025"))).toBe(false);
  });
});
