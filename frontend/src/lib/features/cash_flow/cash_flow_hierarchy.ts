import { sumBy } from "es-toolkit";
import type { Graph } from "$lib/shared/charts/types";
import type { FinancialHierarchyNode } from "$lib/shared/charts/hierarchy_data";
import type { FinancialHierarchyChartData } from "$lib/shared/charts/echarts/hierarchy";

function parentAccount(account: string): string | undefined {
  const parts = account.split(":");
  return parts.length > 1 ? parts.slice(0, -1).join(":") : undefined;
}

function accountLabel(account: string): string {
  return account.split(":").at(-1) ?? account;
}

/**
 * Builds a hierarchical tree of financial nodes from a cash flow Graph.
 * Groups by top-level account types (Income, Expenses, Assets, Liabilities)
 * and rolls up sub-account values through their hierarchy.
 */
export function buildCashFlowHierarchy(graph: Graph): FinancialHierarchyNode[] {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return [];
  }

  const incoming = new Map<number, number>();
  const outgoing = new Map<number, number>();

  for (const link of graph.links ?? []) {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  }

  // Map to hold all hierarchy nodes by full account path
  const nodes = new Map<string, FinancialHierarchyNode>();

  for (let index = 0; index < graph.nodes.length; index++) {
    const node = graph.nodes[index];
    const nodeId = typeof node.id === "number" ? node.id : index;
    const rawVal = Math.max(
      incoming.get(nodeId) ?? 0,
      outgoing.get(nodeId) ?? 0,
    );

    const account = node.name;
    const parts = account.split(":");
    const rootCategory = parts[0] || "Other";

    // Ensure all intermediate ancestor nodes exist
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join(":");
      if (!nodes.has(path)) {
        nodes.set(path, {
          id: path,
          label: accountLabel(path),
          value: 0,
          categoryKey: rootCategory,
          metadata: { account: path },
          children: [],
        });
      }
    }

    // Set value on the specific node
    const targetNode = nodes.get(account);
    if (targetNode) {
      targetNode.value = Math.max(targetNode.value, rawVal);
    }
  }

  // Connect children to parents
  const roots: FinancialHierarchyNode[] = [];
  const sortedPaths = [...nodes.keys()].sort((a, b) => a.localeCompare(b));

  for (const path of sortedPaths) {
    const node = nodes.get(path)!;
    const parentPath = parentAccount(path);
    if (parentPath && nodes.has(parentPath)) {
      const parent = nodes.get(parentPath)!;
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    } else if (!parentPath) {
      roots.push(node);
    }
  }

  // Roll up values from leaves to parents
  const rollup = (node: FinancialHierarchyNode): number => {
    if (node.children && node.children.length > 0) {
      const childrenSum = sumBy(node.children, rollup);
      node.value = Math.max(node.value, childrenSum);
    } else {
      delete node.children;
    }
    return node.value;
  };

  roots.forEach(rollup);

  // Filter out zero-value root branches if positive values exist
  const activeRoots = roots.filter((r) => r.value > 0);
  const resultRoots = activeRoots.length > 0 ? activeRoots : roots;
  const grandTotal = sumBy(resultRoots, (r) => r.value);

  const calculatePercentages = (node: FinancialHierarchyNode) => {
    node.percentage = grandTotal > 0 ? (node.value / grandTotal) * 100 : 0;
    node.children?.forEach(calculatePercentages);
  };

  resultRoots.forEach(calculatePercentages);

  return resultRoots;
}

export function buildCashFlowHierarchyData(
  graph: Graph,
): FinancialHierarchyChartData {
  return {
    roots: buildCashFlowHierarchy(graph),
    mode: "treemap",
  };
}
