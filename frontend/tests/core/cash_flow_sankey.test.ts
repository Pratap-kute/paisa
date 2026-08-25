import { describe, expect, it } from "vitest";
import {
  buildCashFlowSankeyData,
  buildCashFlowSankeyOption,
  findDirectedCycles,
} from "$lib/shared/charts/echarts/cash_flow_sankey";
import type { Graph } from "$lib/shared/charts/types";
import browserExpense from "../fixture/browser/expense.json" with {
  type: "json",
};

const graph: Graph = {
  nodes: [
    { id: 1, name: "Income:Salary:Acme" },
    { id: 2, name: "Assets:Checking" },
    { id: 3, name: "Expenses:Food" },
    { id: 4, name: "Assets:Investment" },
  ],
  links: [
    { source: 1, target: 2, value: 100_000 },
    { source: 2, target: 3, value: 30_000 },
    { source: 4, target: 2, value: 5_000 },
  ],
};

describe("cash-flow Sankey ECharts adapter", () => {
  it("preserves source/target/value parity from the filtered domain graph", () => {
    const data = buildCashFlowSankeyData(graph);

    expect(data.nodes.map((node) => node.id)).toEqual([1, 2, 3, 4]);
    expect(data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }))).toEqual(graph.links);
    expect(data.totals.linkValue).toBe(
      graph.links.reduce((sum, link) => sum + link.value, 0),
    );
  });

  it("computes node totals from max incoming/outgoing flow without changing link totals", () => {
    const data = buildCashFlowSankeyData(graph);
    const checking = data.nodes.find((node) => node.name === "Assets:Checking");
    const investment = data.nodes.find((node) =>
      node.name === "Assets:Investment"
    );

    expect(checking?.value).toBe(105_000);
    expect(investment?.value).toBe(5_000);
    expect(data.totals.nodeValue).toBe(
      data.nodes.reduce((sum, node) => sum + node.value, 0),
    );
  });

  it("does not treat fixture back-edges as true directed cycles", () => {
    const data = buildCashFlowSankeyData(graph);

    expect(data.hasCircularLinks).toBe(false);
    expect(data.circularLinks).toEqual([]);
    expect(data.cycles).toEqual([]);
  });

  it("detects an explicit true cycle A -> B -> C -> A", () => {
    const cycleGraph: Graph = {
      nodes: [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ],
      links: [
        { source: 1, target: 2, value: 10 },
        { source: 2, target: 3, value: 20 },
        { source: 3, target: 1, value: 30 },
      ],
    };
    const data = buildCashFlowSankeyData(cycleGraph);

    expect(findDirectedCycles(cycleGraph)).toEqual([[1, 2, 3, 1]]);
    expect(data.hasCircularLinks).toBe(true);
    expect(data.circularLinks.map((link) => [link.source, link.target]))
      .toEqual([
        [1, 2],
        [2, 3],
        [3, 1],
      ]);
    expect(
      data.cycles.map((cycle) =>
        cycle.map((link) => [link.source, link.target])
      ),
    ).toEqual([[
      [1, 2],
      [2, 3],
      [3, 1],
    ]]);

    const option = buildCashFlowSankeyOption(data);
    expect(option.baseOption.series[0].type).toBe("graph");
    expect(option.baseOption.series[0].data.map((node) => node.nodeId)).toEqual(
      [1, 2, 3],
    );
    expect(option.baseOption.series[0].links.map((link) => ({
      source: link.sourceId,
      target: link.targetId,
      value: link.value,
    }))).toEqual(cycleGraph.links);
    expect(option.media[0].option.series[0].label.show).toBe(false);
  });

  it("reports no true directed cycles in the real browser cash-flow fixture", () => {
    const graphs = Object.values(browserExpense.graph) as Graph[];

    expect(graphs.length).toBeGreaterThan(0);
    for (const fixtureGraph of graphs) {
      expect(findDirectedCycles(fixtureGraph)).toEqual([]);
      expect(buildCashFlowSankeyData(fixtureGraph).hasCircularLinks).toBe(
        false,
      );
    }
  });

  it("creates intent-shaped ECharts sankey options without exposing D3 scales", () => {
    const data = buildCashFlowSankeyData(graph);
    const option = buildCashFlowSankeyOption(data, {
      theme: {
        fontFamily: "Paisa Sans",
        textColor: "rgb(1, 2, 3)",
        mutedColor: "rgb(4, 5, 6)",
        borderColor: "rgb(7, 8, 9)",
        gridColor: "rgb(7, 8, 9)",
        surfaceColor: "rgb(10, 11, 12)",
        tooltipSurfaceColor: "rgb(13, 14, 15)",
        tooltipTextColor: "rgb(240, 241, 242)",
        primaryColor: "rgb(16, 17, 18)",
        positiveColor: "rgb(19, 20, 21)",
        negativeColor: "rgb(22, 23, 24)",
        warningColor: "rgb(25, 26, 27)",
        neutralColor: "rgb(28, 29, 30)",
        seriesColors: ["red", "green"],
      },
    });
    const series = option.media[0].option.series[0];

    expect(series.type).toBe("sankey");
    expect(series.nodeWidth).toBe(10);
    expect(series.data).toHaveLength(graph.nodes.length);
    expect(series.links).toHaveLength(graph.links.length);
    expect(JSON.stringify(option)).not.toContain("xScale");
    expect(JSON.stringify(option)).not.toContain("pathGenerator");
  });
});
