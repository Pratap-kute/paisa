import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  createInterestOverviewChart,
  createInterestPerAccountChart,
  maxOverviewY,
  renderPerAccountOverview,
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
    expect(Number(svg?.getAttribute("width"))).toBeGreaterThanOrEqual(1070);
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
    const plotRight = 150 + 900;
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

  it("per-account chart keeps one row per account after resize redraws", () => {
    document.body.innerHTML = `
      <div class="paisa-chart-frame-body" style="width:800px">
        <div id="d3-interest-timeline-breakdown" style="width:800px"></div>
      </div>`;
    const interests = parseInterests();
    const chart = createInterestPerAccountChart();
    chart.update(interests);
    chart.resize({ width: 800, height: 600 });
    chart.resize({ width: 600, height: 600 });
    const root = document.querySelector("#d3-interest-timeline-breakdown");
    const rows = root?.querySelectorAll(":scope > .paisa-interest-account-row");
    expect(rows?.length).toBe(interests.length);
    const svgs = root?.querySelectorAll(".paisa-interest-chart-card svg");
    for (const svg of svgs ?? []) {
      expect(Number(svg.getAttribute("width"))).toBeGreaterThanOrEqual(760);
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
});
