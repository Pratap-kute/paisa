import type { Graph, Legend } from "$lib/core/utils";
import { firstName } from "$lib/core/utils";
import { generateColorScheme } from "$lib/core/colors";
import { iconify } from "$lib/core/icon";
import type { FlowLink, FlowNode } from "$lib/charts/echarts/flow";
import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";

export interface CashFlowSankeyNode extends FlowNode {}
export interface CashFlowSankeyLink extends FlowLink {}

export interface CashFlowSankeyData {
  nodes: CashFlowSankeyNode[];
  links: CashFlowSankeyLink[];
  legends: Legend[];
  hasCircularLinks: boolean;
  circularLinks: CashFlowSankeyLink[];
  cycles: CashFlowSankeyLink[][];
  totals: {
    nodeValue: number;
    linkValue: number;
  };
}

export interface CashFlowSankeyOptions {
  width?: number;
  darkMode?: boolean;
  theme?: PaisaChartTheme;
}

function displayName(account: string): string {
  return iconify(account).replace(/<[^>]*>/g, "");
}

function labelName(name: string): string {
  return displayName(name);
}

export function findDirectedCycles(graph: Graph): number[][] {
  const adjacency = new Map<number, number[]>();
  const knownNodes = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const link of graph.links) {
    if (knownNodes.has(link.source) && knownNodes.has(link.target)) {
      adjacency.get(link.source)?.push(link.target);
    }
  }

  const color = new Map<number, "gray" | "black">();
  const stack: number[] = [];
  const cycles: number[][] = [];
  const seen = new Set<string>();

  function visit(id: number) {
    color.set(id, "gray");
    stack.push(id);

    for (const target of adjacency.get(id) ?? []) {
      if (color.get(target) === "gray") {
        const index = stack.indexOf(target);
        const cycle = [...stack.slice(index), target];
        const key = canonicalCycleKey(cycle);
        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(cycle);
        }
      } else if (!color.has(target)) {
        visit(target);
      }
    }

    stack.pop();
    color.set(id, "black");
  }

  for (const node of graph.nodes) {
    if (!color.has(node.id)) visit(node.id);
  }

  return cycles;
}

function canonicalCycleKey(cycle: number[]): string {
  const openCycle = cycle.slice(0, -1);
  const minIndex = openCycle.reduce(
    (best, id, index) => id < openCycle[best] ? index : best,
    0,
  );
  const rotated = [
    ...openCycle.slice(minIndex),
    ...openCycle.slice(0, minIndex),
  ];
  return rotated.join("->");
}

export function buildCashFlowSankeyData(graph: Graph): CashFlowSankeyData {
  const accounts = [...new Set(graph.nodes.map((node) => firstName(node.name)))]
    .sort();
  const color = generateColorScheme(accounts);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<number, number>();
  const outgoing = new Map<number, number>();

  for (const link of graph.links) {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  }

  const nodes = graph.nodes.map((node) => {
    const group = firstName(node.name);
    const value = Math.max(
      incoming.get(node.id) ?? 0,
      outgoing.get(node.id) ?? 0,
    );
    return {
      id: node.id,
      name: node.name,
      label: labelName(node.name),
      group,
      value,
      color: color(group),
    };
  });

  const cycleIds = findDirectedCycles(graph);
  const cycleEdges = new Set<string>();
  for (const cycle of cycleIds) {
    for (let index = 0; index < cycle.length - 1; index++) {
      cycleEdges.add(`${cycle[index]}:${cycle[index + 1]}`);
    }
  }

  const links = graph.links.flatMap((link) => {
    const source = nodeById.get(link.source);
    const target = nodeById.get(link.target);
    if (!source || !target) return [];

    return [{
      source: link.source,
      target: link.target,
      sourceName: source.name,
      targetName: target.name,
      value: link.value,
      cycle: cycleEdges.has(`${link.source}:${link.target}`),
    }];
  });

  const linkByEdge = new Map(links.map((link) => [
    `${link.source}:${link.target}`,
    link,
  ]));
  const cycles = cycleIds.map((cycle) =>
    cycle.slice(0, -1).flatMap((source, index) => {
      const target = cycle[index + 1];
      const link = linkByEdge.get(`${source}:${target}`);
      return link ? [link] : [];
    })
  );
  const circularLinks = links.filter((link) => link.cycle);
  const legends: Legend[] = accounts.map((account) => ({
    label: account,
    color: color(account),
    shape: "square",
  }));

  return {
    nodes,
    links,
    legends,
    hasCircularLinks: circularLinks.length > 0,
    circularLinks,
    cycles,
    totals: {
      nodeValue: nodes.reduce((sum, node) => sum + node.value, 0),
      linkValue: links.reduce((sum, link) => sum + link.value, 0),
    },
  };
}

export function buildCashFlowSankeyOption(
  data: CashFlowSankeyData,
  options: CashFlowSankeyOptions = {},
) {
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const textColor = options.theme?.textColor ?? "currentColor";
  const mutedColor = options.theme?.mutedColor ?? textColor;
  const borderColor = options.theme?.borderColor ?? textColor;

  return {
    backgroundColor: "transparent",
    animationDuration: 300,
    color: options.theme?.seriesColors,
    tooltip: {
      trigger: "item",
      confine: true,
      borderColor,
      backgroundColor: options.theme?.tooltipSurfaceColor,
      textStyle: {
        color: textColor,
      },
      formatter: (
        params: { dataType?: string; data?: Record<string, unknown> },
      ) => {
        const item = params.data ?? {};
        if (params.dataType === "edge") {
          return [
            `<strong>${
              displayName(String(item.sourceName ?? item.source ?? ""))
            }</strong>`,
            `to ${displayName(String(item.targetName ?? item.target ?? ""))}`,
            chartFormatters.currency(Number(item.value ?? 0)),
          ].join("<br/>");
        }

        return [
          `<strong>${displayName(String(item.name ?? ""))}</strong>`,
          chartFormatters.currency(Number(item.value ?? 0)),
        ].join("<br/>");
      },
    },
    series: [
      {
        type: "sankey",
        name: "Cash Flow",
        top: mobile ? 12 : 24,
        right: mobile ? 12 : 48,
        bottom: mobile ? 12 : 24,
        left: mobile ? 12 : 48,
        nodeWidth: mobile ? 10 : 18,
        nodeGap: mobile ? 8 : 14,
        layoutIterations: 64,
        emphasis: {
          focus: "adjacency",
        },
        label: {
          color: textColor,
          fontSize: mobile ? 10 : 12,
          overflow: "truncate",
          width: mobile ? 84 : 160,
          formatter: (
            params: { data?: { label?: string; value?: number } },
          ) => {
            const label = params.data?.label ?? "";
            if (mobile) return label;
            return `${label} ${
              chartFormatters.currency(Number(params.data?.value ?? 0))
            }`;
          },
        },
        lineStyle: {
          color: "target",
          opacity: options.darkMode ? 0.36 : 0.28,
          curveness: 0.5,
        },
        data: data.nodes.map((node) => ({
          id: String(node.id),
          name: String(node.id),
          label: node.label,
          value: node.value,
          itemStyle: {
            color: node.color,
          },
        })),
        links: data.links.map((link) => ({
          source: String(link.source),
          target: String(link.target),
          sourceName: link.sourceName,
          targetName: link.targetName,
          value: link.value,
          lineStyle: {
            color: data.nodes.find((node) => node.id === link.target)?.color,
          },
        })),
        levels: [
          {
            depth: 0,
            itemStyle: {
              borderColor,
              borderWidth: 1,
            },
            lineStyle: {
              opacity: 0.35,
            },
          },
        ],
      },
    ],
    textStyle: {
      color: mutedColor,
      fontFamily: "var(--paisa-font-sans)",
    },
  };
}
