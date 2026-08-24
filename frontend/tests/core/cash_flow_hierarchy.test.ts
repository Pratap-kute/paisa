import { describe, expect, it } from "vitest";
import {
  buildCashFlowHierarchy,
  buildCashFlowHierarchyData,
} from "$lib/charts/cash_flow_hierarchy";
import type { Graph } from "$lib/core/utils";
import browserExpense from "../fixture/browser/expense.json" with {
  type: "json",
};

const graph: Graph = {
  nodes: [
    { id: 1, name: "Income:Salary:Acme" },
    { id: 2, name: "Assets:Checking:SBI" },
    { id: 3, name: "Expenses:Food:Groceries" },
    { id: 4, name: "Expenses:Food:Dining" },
    { id: 5, name: "Expenses:Housing:Rent" },
  ],
  links: [
    { source: 1, target: 2, value: 100_000 },
    { source: 2, target: 3, value: 20_000 },
    { source: 2, target: 4, value: 10_000 },
    { source: 2, target: 5, value: 40_000 },
  ],
};

describe("Cash Flow Hierarchy & Treemap transformer", () => {
  it("builds root-level account groups from graph paths", () => {
    const roots = buildCashFlowHierarchy(graph);
    const rootLabels = roots.map((r) => r.id);

    expect(rootLabels).toContain("Income");
    expect(rootLabels).toContain("Assets");
    expect(rootLabels).toContain("Expenses");
  });

  it("rolls up child account values to ancestor categories", () => {
    const roots = buildCashFlowHierarchy(graph);
    const expenses = roots.find((r) => r.id === "Expenses");

    expect(expenses).toBeDefined();
    expect(expenses?.value).toBe(70_000); // 20k + 10k + 40k

    const foodCategory = expenses?.children?.find((c) =>
      c.id === "Expenses:Food"
    );
    expect(foodCategory).toBeDefined();
    expect(foodCategory?.value).toBe(30_000); // 20k + 10k
    expect(foodCategory?.children).toHaveLength(2);
  });

  it("calculates accurate percentages across active roots", () => {
    const roots = buildCashFlowHierarchy(graph);
    const totalValue = roots.reduce((sum, r) => sum + r.value, 0);
    const totalPercentage = roots.reduce(
      (sum, r) => sum + (r.percentage ?? 0),
      0,
    );

    expect(Math.round(totalPercentage)).toBe(100);

    const income = roots.find((r) => r.id === "Income");
    expect(income?.percentage).toBeCloseTo((100_000 / totalValue) * 100, 1);
  });

  it("handles cyclical graphs gracefully without crashes or infinite recursion", () => {
    const cycleGraph: Graph = {
      nodes: [
        { id: 1, name: "Assets:Checking:A" },
        { id: 2, name: "Assets:Checking:B" },
        { id: 3, name: "Expenses:Misc" },
      ],
      links: [
        { source: 1, target: 2, value: 50 },
        { source: 2, target: 1, value: 50 },
        { source: 2, target: 3, value: 25 },
      ],
    };

    const treemapData = buildCashFlowHierarchyData(cycleGraph);
    expect(treemapData.mode).toBe("treemap");
    expect(treemapData.roots.length).toBeGreaterThan(0);
    expect(treemapData.roots.find((r) => r.id === "Assets")?.value)
      .toBeGreaterThan(0);
  });

  it("builds hierarchy from real browser expense fixture", () => {
    const graphs = Object.values(browserExpense.graph) as Graph[];
    expect(graphs.length).toBeGreaterThan(0);

    for (const fixtureGraph of graphs) {
      const roots = buildCashFlowHierarchy(fixtureGraph);
      expect(Array.isArray(roots)).toBe(true);
      const totalLinkValue = fixtureGraph.links.reduce(
        (s, l) => s + l.value,
        0,
      );
      if (fixtureGraph.nodes.length > 0 && totalLinkValue > 0) {
        expect(roots.length).toBeGreaterThan(0);
        roots.forEach((root) => {
          expect(root.value).toBeGreaterThan(0);
          expect(root.categoryKey).toBeDefined();
        });
      }
    }
  });
});
