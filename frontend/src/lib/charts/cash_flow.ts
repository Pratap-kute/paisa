// deno-lint-ignore-file no-explicit-any -- d3-sankey-circular does not expose usable TypeScript datum types.
import {
  type CashFlow,
  formatCurrencyCrude,
  type Graph,
  lastName,
  type Legend,
  type Node,
  parentName,
  rem,
  restName,
  skipTicks,
  getColorPreference,
} from "../core/utils";
import * as d3 from "d3";
import { sankeyCircular, sankeyJustify } from "d3-sankey-circular";
import { pathArrows } from "d3-path-arrows";
import _ from "lodash";
import { firstName } from "../core/utils";
import { tooltip } from "../core/utils";
import { formatCurrency } from "../core/utils";
import { iconify } from "../core/icon";
import { willClearTippy } from "../../store";
import COLORS, { generateColorScheme } from "../core/colors";
import textures from "textures";
import chroma from "chroma-js";

export interface MonthlyFlowChart {
  update: (cashFlows: CashFlow[]) => void;
  resize: (dimensions: { width: number; height: number }) => void;
  destroy: () => void;
  legends: Legend[];
}

export function createMonthlyFlow(
  target: string | SVGElement,
  options = {
    rotate: true,
    balance: 0,
  },
): MonthlyFlowChart {
  const MAX_BAR_WIDTH = rem(20);
  const el = typeof target === "string"
    ? document.getElementById(target.startsWith("#") ? target.substring(1) : target)
    : target;

  if (!el) {
    return {
      update: () => {},
      resize: () => {},
      destroy: () => {},
      legends: [],
    };
  }

  const svg = d3.select(el as any);
  svg.selectAll("*").remove();

  const margin = {
    top: rem(15),
    right: rem(30),
    bottom: options.rotate ? rem(50) : rem(20),
    left: rem(40),
  };

  let currentWidth = Math.max(100, (el.parentElement?.clientWidth || 600) - margin.left - margin.right);
  let currentHeight = Math.max(100, (el.clientHeight || Number(svg.attr("height")) || 400) - margin.top - margin.bottom);

  const g = svg.append("g").attr(
    "transform",
    "translate(" + margin.left + "," + margin.top + ")",
  );

  const darkMode = getColorPreference() === "dark";
  const texture = textures
    .lines()
    .strokeWidth(1)
    .size(darkMode ? 5 : 4)
    .orientation("vertical")
    .background(
      darkMode
        ? chroma(COLORS.expenses).darken(0.8).hex()
        : chroma(COLORS.expenses).brighten(1.5).hex(),
    )
    .stroke(darkMode ? chroma(COLORS.expenses).brighten(0.2).hex() : COLORS.expenses);
  svg.call(texture);

  const areaKeys = ["income", "expenses", "liabilities", "tax", "investment"];
  const colors = [
    darkMode ? chroma(COLORS.income).brighten(0.2).hex() : COLORS.income,
    darkMode ? chroma(COLORS.expenses).brighten(0.15).hex() : COLORS.expenses,
    darkMode ? chroma(COLORS.liabilities).brighten(0.15).hex() : COLORS.liabilities,
    darkMode ? chroma(COLORS.expenses).brighten(0.15).hex() : COLORS.expenses,
    darkMode ? chroma(COLORS.assets).brighten(0.15).hex() : COLORS.assets,
  ];

  const lineKeys = ["balance"];
  const lineScale = d3.scaleOrdinal<string>().domain(lineKeys).range([
    darkMode ? "#7dd3fc" : COLORS.primary,
  ]);

  const x = d3.scaleBand().range([0, currentWidth]).paddingInner(0.1);
  const y = d3.scaleLinear().range([currentHeight, 0]);
  const z = d3.scaleOrdinal<string>(colors).domain(areaKeys);

  const x1 = d3.scaleBand().domain(["0", "1"]).paddingInner(0.1).paddingOuter(0.1);

  const xAxis = g
    .append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + currentHeight + ")");

  const yAxis = g.append("g").attr("class", "axis y");
  const groups = g.append("g");

  const line = g
    .append("path")
    .attr("stroke", COLORS.primary)
    .attr("stroke-width", "2px")
    .attr("fill", "none");

  const tooltipRects = g.append("g");

  let currentData: CashFlow[] = [];
  let firstRender = true;

  function render(cashFlows: CashFlow[], animate = true) {
    currentData = cashFlows;
    if (_.isEmpty(cashFlows)) {
      groups.selectAll("*").remove();
      line.attr("d", null);
      tooltipRects.selectAll("*").remove();
      return;
    }

    const positions = _.flatMap(cashFlows, (c) => [
      c.income + (c.investment < 0 ? -c.investment : 0) +
      (c.liabilities > 0 ? c.liabilities : 0),
      c.expenses +
      c.tax +
      (c.investment > 0 ? c.investment : 0) +
      (c.liabilities < 0 ? -c.liabilities : 0),
      c.balance,
    ]);
    positions.push(0);

    x.domain(_.map(cashFlows, (c) => c.date.format("MMM YYYY")));
    y.domain(d3.extent(positions));
    x1.range([0, x.bandwidth()]);

    const duration = (!animate || firstRender) ? 0 : 500;
    firstRender = false;
    const t = svg.transition().duration(duration);

    const axis = (duration > 0 ? xAxis.transition(t) : xAxis)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat(skipTicks(30, x, (d) => d.toString())),
      )
      .selectAll("text")
      .attr("y", 10)
      .attr("x", -8)
      .attr("dy", ".35em");

    if (options.rotate) {
      axis.attr("transform", "rotate(-45)").style("text-anchor", "end");
    }

    (duration > 0 ? yAxis.transition(t) : yAxis).call(
      d3.axisLeft(y).tickSize(-currentWidth).tickFormat(formatCurrencyCrude),
    );

    const gbars = groups
      .selectAll("g.group")
      .data(cashFlows, (d: any) => d.date.format("MMM YYYY"))
      .join(
        (enter) =>
          enter
            .append("g")
            .attr("class", "group")
            .attr("transform", (c) =>
              `translate(${x(c.date.format("MMM YYYY"))},0)`),
        (update) =>
          (duration > 0 ? update.transition(t) : update)
            .attr("transform", (c) =>
              `translate(${x(c.date.format("MMM YYYY"))},0)`),
        (exit) => exit.remove(),
      );

    gbars
      .selectAll("g")
      .data((c) => [
        d3.stack().keys(["income", "liabilities", "investment"])([
          {
            i: "0",
            data: c,
            income: c.income,
            liabilities: c.liabilities > 0 ? c.liabilities : 0,
            investment: c.investment < 0 ? -c.investment : 0,
          },
        ] as any),
        d3.stack().keys(["expenses", "tax", "investment", "liabilities"])([
          {
            i: "1",
            data: c,
            expenses: c.expenses,
            tax: c.tax,
            investment: c.investment > 0 ? c.investment : 0,
            liabilities: c.liabilities < 0 ? -c.liabilities : 0,
          },
        ] as any),
      ])
      .join("g")
      .selectAll("rect")
      .data((d) => d)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("fill", (d) => {
              if (d.key === "tax") {
                return texture.url();
              }
              return z(d.key);
            })
            .attr("fill-opacity", 0.6)
            .attr("x", (d: any) =>
              d[0].data.i === "0"
                ? x1(d[0].data.i) + x1.bandwidth() -
                  Math.min(x1.bandwidth(), MAX_BAR_WIDTH)
                : x1(d[0].data.i))
            .attr("width", Math.min(x1.bandwidth(), MAX_BAR_WIDTH))
            .attr("y", y.range()[0])
            .call((sel) => duration > 0 ? sel.transition(t) : sel)
            .attr("y", (d: any) => y(d[0][1]))
            .attr("height", (d: any) => y(d[0][0]) - y(d[0][1])),
        (update) =>
          (duration > 0 ? update.transition(t) : update)
            .attr("fill", (d) => {
              if (d.key === "tax") {
                return texture.url();
              }
              return z(d.key);
            })
            .attr("x", (d: any) =>
              d[0].data.i === "0"
                ? x1(d[0].data.i) + x1.bandwidth() -
                  Math.min(x1.bandwidth(), MAX_BAR_WIDTH)
                : x1(d[0].data.i))
            .attr("y", (d: any) => y(d[0][1]))
            .attr("height", (d: any) => y(d[0][0]) - y(d[0][1]))
            .attr("width", Math.min(x1.bandwidth(), MAX_BAR_WIDTH)),
        (exit) => exit.remove(),
      );

    line.attr(
      "d",
      d3
        .line<CashFlow>()
        .curve(d3.curveMonotoneX)
        .x((c) => (x(c.date.format("MMM YYYY")) || 0) + x.bandwidth() / 2)
        .y((c) => y(c.balance))(cashFlows),
    );

    tooltipRects
      .selectAll("rect")
      .data(cashFlows)
      .join("rect")
      .attr("fill", "transparent")
      .attr("data-tippy-content", (c: CashFlow) => {
        return tooltip(
          [
            ["Income", [
              formatCurrency(c.income),
              "has-text-weight-bold has-text-right",
            ]],
            ["Liabilities", [
              formatCurrency(c.liabilities),
              "has-text-weight-bold has-text-right",
            ]],
            ["Expenses", [
              formatCurrency(c.expenses),
              "has-text-weight-bold has-text-right",
            ]],
            ["Tax", [
              formatCurrency(c.tax),
              "has-text-weight-bold has-text-right",
            ]],
            ["Investment", [
              formatCurrency(c.investment),
              "has-text-weight-bold has-text-right",
            ]],
            ["Checking", [
              formatCurrency(c.checking),
              "has-text-weight-bold has-text-right",
            ]],
            ["Checking Balance", [
              formatCurrency(c.balance),
              "has-text-weight-bold has-text-right",
            ]],
          ],
          { header: c.date.format("MMM YYYY") },
        );
      })
      .attr("x", (c) => x(c.date.format("MMM YYYY")) || 0)
      .attr("y", 0)
      .attr("height", currentHeight)
      .attr("width", x.bandwidth());
  }

  function resize(dimensions: { width: number; height: number }) {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    currentWidth = Math.max(50, dimensions.width - margin.left - margin.right);
    currentHeight = Math.max(50, dimensions.height - margin.top - margin.bottom);

    x.range([0, currentWidth]);
    y.range([currentHeight, 0]);
    x1.range([0, x.bandwidth()]);

    xAxis.attr("transform", "translate(0," + currentHeight + ")");
    render(currentData, false);
  }

  const legends: Legend[] = _.map(_.without(areaKeys, "tax"), (k) => ({
    label: k,
    color: z(k),
    shape: "square",
  }));

  legends.push({
    label: "tax",
    color: z("tax"),
    shape: "square",
    texture: texture,
  });

  legends.unshift({
    label: "Checking Balance\n" +
      (options.balance > 0 ? " " + formatCurrency(options.balance) : ""),
    color: lineScale("balance"),
    shape: "line",
  });

  return {
    update: render,
    resize,
    destroy: () => {
      svg.selectAll("*").remove();
    },
    legends,
  };
}

export function renderMonthlyFlow(
  id: string,
  options = {
    rotate: true,
    balance: 0,
  },
) {
  const chart = createMonthlyFlow(id, options);
  return {
    renderer: chart.update,
    resize: chart.resize,
    destroy: chart.destroy,
    legends: chart.legends,
  };
}

export function renderFlow(graph: Graph) {
  const id = "#d3-expense-flow";
  const el = document.getElementById(id.substring(1));
  if (!el?.parentElement) return;

  const svg = d3.select(id),
    margin = {
      top: rem(20),
      right: rem(20),
      bottom: rem(40),
      left: rem(20),
    },
    width = Math.max(
      el.parentElement.clientWidth,
      1000,
    ) -
      margin.left -
      margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

  willClearTippy.update((n) => n + 1);
  svg.selectAll("*").remove();

  if (graph == null) {
    return;
  }

  const accounts = _.chain(graph.nodes)
    .map((n) => firstName(n.name))
    .uniq()
    .sort()
    .value();
  const color = generateColorScheme(accounts);

  const g = svg
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const sankey = sankeyCircular()
    .nodeWidth(rem(20))
    .nodePaddingRatio(0.7)
    .size([width, height])
    .nodeId((d: Node) => d.id)
    .nodeAlign(sankeyJustify)
    .iterations(64)
    .circularLinkGap(2);

  const linkG = g
    .append("g")
    .attr("class", "links")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.2)
    .selectAll("path");

  const nodeG = g
    .append("g")
    .attr("class", "nodes")
    .attr("font-family", "sans-serif")
    .attr("font-size", "0.754rem")
    .selectAll("g");

  const sankeyData = sankey(graph);
  const sankeyNodes = sankeyData.nodes;
  const sankeyLinks = sankeyData.links;

  d3.extent(sankeyNodes, (d: any) => d.depth);

  const node = nodeG.data(sankeyNodes).enter().append("g");

  node
    .append("rect")
    .attr("x", (d: any) => d.x0)
    .attr("y", (d: any) => d.y0)
    .attr("height", (d: any) => d.y1 - d.y0)
    .attr("width", (d: any) => d.x1 - d.x0)
    .style("fill", (d: any) => color(firstName(d.name)))
    .attr("data-tippy-content", (d: any) =>
      tooltip([
        ["Account", iconify(d.name)],
        ["Total", [
          formatCurrency(d.value),
          "has-text-right has-text-weight-bold",
        ]],
      ]));

  node
    .append("text")
    .attr("x", (d: any) => (d.x0 + d.x1) / 2)
    .attr("y", (d: any) => d.y0 - 12)
    .attr("dx", (d: any) => {
      if (_.isEmpty(d.sourceLinks)) {
        return "10px";
      }

      if (_.isEmpty(d.targetLinks)) {
        return "-10px";
      }

      return "0px";
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", (d: any) => {
      if (_.isEmpty(d.sourceLinks)) {
        return "end";
      }

      if (_.isEmpty(d.targetLinks)) {
        return "start";
      }

      return "middle";
    })
    .classed("svg-text-grey-dark", true)
    .text((d: any) => `${name(d)} ${formatCurrencyCrude(d.value)}`);

  const link = linkG.data(sankeyLinks).enter().append("g");

  link
    .append("path")
    .attr("class", "sankey-link")
    .attr("d", (link: any) => link.path)
    .style("stroke-width", (d: any) => Math.max(1, d.width))
    .style("opacity", 0.5)
    .style("stroke", (d: any) => color(firstName(d.target.name)))
    .attr("data-tippy-content", (d: any) =>
      tooltip([
        ["Debit Account", iconify(d.source.name)],
        ["Credit Account", iconify(d.target.name)],
        ["Total", [
          formatCurrency(d.value),
          "has-text-right has-text-weight-bold",
        ]],
      ]));

  const arrows = pathArrows()
    .arrowLength(10)
    .gapLength(150)
    .arrowHeadSize(3)
    .path((link: any) => link.path);

  linkG.data(sankeyLinks).enter().append("g").attr("class", "g-arrow").call(
    arrows,
  );

  const legends: Legend[] = _.map(accounts, (k) => ({
    label: k,
    color: color(k),
    shape: "square",
  }));
  return legends;
}

function name(node: Node) {
  let name: string, group: string;
  if (node.name.startsWith("Income") || node.name.startsWith("Expenses")) {
    name = lastName(node.name);
    group = parentName(node.name);
  } else {
    name = restName(node.name);
    group = firstName(node.name);
  }

  return iconify(name, { group: group });
}
