// deno-lint-ignore-file no-explicit-any -- D3 hierarchy nodes are extended by the treemap layout.
import * as d3 from "d3";
import type dayjs from "dayjs";
import _ from "lodash";
import {
  type Aggregate,
  darkenOrLighten,
  formatCurrency,
  formatFloat,
  lastName,
  type Legend,
  now,
  parentName,
  secondName,
  tooltip,
} from "../core/utils";
import { generateColorScheme } from "../core/colors";

export function renderAllocation(
  aggregates: Record<string, Aggregate>,
  color: d3.ScaleOrdinal<string, string>,
) {
  const catEl = document.getElementById("d3-allocation-category");
  if (catEl) {
    catEl.innerHTML = "";
    renderPartition(catEl, aggregates, d3.partition(), color);
  }
  const valEl = document.getElementById("d3-allocation-value");
  if (valEl) {
    valEl.innerHTML = "";
    renderPartition(valEl, aggregates, d3.treemap(), color);
  }
}

function renderPartition(
  element: HTMLElement,
  aggregates: Record<string, Aggregate>,
  hierarchy: any,
  color: d3.ScaleOrdinal<string, string>,
  options = { margin: { top: 0, right: 20, bottom: 0, left: 0 } },
) {
  if (_.isEmpty(aggregates)) {
    return;
  }

  const div = d3.select(element);
  div.selectAll("*").remove();
  div.style("position", "relative");

  const margin = options.margin,
    width = element.parentElement.clientWidth - margin.left - margin.right,
    height = +div.style("height").replace("px", "") - margin.top -
      margin.bottom;

  const percent = (d: d3.HierarchyNode<Aggregate>) => {
    return formatFloat((d.value / root.value) * 100) + "%";
  };

  const stratify = d3
    .stratify<Aggregate>()
    .id((d) => d.account)
    .parentId((d) => parentName(d.account));

  const partition = hierarchy.size([width, height]).round(true);

  const root = stratify(_.sortBy(aggregates, (a) => a.account))
    .sum((a) => a.market_amount)
    .sort(function (a, b) {
      return b.height - a.height || b.value - a.value;
    });

  partition(root);

  const cell = div
    .selectAll(".node")
    .data(root.descendants())
    .enter()
    .append("div")
    .attr("class", "node")
    .attr("data-tippy-content", (d) => {
      return tooltip([
        ["Account", [d.id, "paisa-text-right"]],
        ["Market Value", [
          formatCurrency(d.value),
          "paisa-text-bold paisa-text-right",
        ]],
        ["Percentage", [percent(d), "paisa-text-bold paisa-text-right"]],
      ]);
    })
    .style("position", "absolute")
    .style("top", (d: any) => d.y0 + "px")
    .style("left", (d: any) => d.x0 + "px")
    .style("width", (d: any) => Math.max(d.x1 - d.x0, 0) + "px")
    .style("height", (d: any) => Math.max(d.y1 - d.y0, 0) + "px")
    .style("background", (d) => color(d.id))
    .style("color", (d) => darkenOrLighten(color(d.id)));

  cell
    .append("p")
    .attr("class", "heading paisa-text-bold")
    .text((d) => lastName(d.id));

  cell
    .append("p")
    .attr("class", "heading paisa-text-bold")
    .style("font-size", ".5 rem")
    .text(percent);
}

export function renderAllocationTimeline(
  aggregatesTimeline: { [key: string]: Aggregate }[],
): Legend[] {
  const timeline = _.map(aggregatesTimeline, (aggregates) => {
    return _.chain(aggregates)
      .values()
      .filter((a) => a.market_amount != 0)
      .groupBy((a) => secondName(a.account))
      .map((aggregates, group) => {
        return {
          date: aggregates[0].date,
          account: group,
          market_amount: _.sum(_.map(aggregates, (a) => a.market_amount)),
          timestamp: aggregates[0].date,
        };
      })
      .value();
  });
  const assets = _.chain(timeline)
    .last()
    .map((a) => a.account)
    .sort()
    .value();

  const defaultValues = _.zipObject(
    assets,
    _.map(assets, () => 0),
  );
  const start = timeline[0]?.[0]?.timestamp,
    end = now();

  if (!start) {
    return [];
  }

  interface Point {
    date: dayjs.Dayjs;
    [key: string]: number | dayjs.Dayjs;
  }
  const points: Point[] = [];
  _.each(timeline, (aggregates) => {
    const total = _.sum(_.map(aggregates, (a) => a.market_amount));
    if (total == 0) {
      return;
    }
    const kvs = _.map(
      aggregates,
      (a) => [a.account, (a.market_amount / total) * 100],
    );
    points.push(
      _.merge(
        {
          date: aggregates[0].timestamp,
        },
        defaultValues,
        _.fromPairs(kvs),
      ),
    );
  });

  const el = document.getElementById("d3-allocation-timeline");
  if (!el?.parentElement) return [];

  const svg = d3.select("#d3-allocation-timeline"),
    margin = { top: 40, right: 60, bottom: 20, left: 35 },
    width = el.parentElement.clientWidth -
      margin.left -
      margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr(
      "transform",
      "translate(" + margin.left + "," + margin.top + ")",
    );

  const x = d3.scaleTime().range([0, width]).domain([start, end]),
    y = d3
      .scaleLinear()
      .range([height, 0])
      .domain([
        0,
        d3.max(d3.map(points, (p) => d3.max(_.values(_.omit(p, "date"))))),
      ]),
    z = generateColorScheme(assets);

  const line = (group: string) =>
    d3
      .line<Point>()
      .curve(d3.curveLinear)
      .defined((p, i) =>
        (p[group] as number) > 0 || (points[i + 1]?.[group] as number) > 0
      )
      .x((p) => x(p.date))
      .y((p) => y(p[group]));

  g.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "axis y")
    .call(
      d3
        .axisLeft(y)
        .tickSize(-width)
        .tickFormat((y) => `${y}%`),
    );
  g.append("g")
    .attr("class", "axis y")
    .attr("transform", `translate(${width},0)`)
    .call(d3.axisRight(y).tickFormat((y) => `${y}%`));

  const layer = g.selectAll(".layer").data(assets).enter().append("g").attr(
    "class",
    "layer",
  );

  layer
    .append("path")
    .attr("fill", "none")
    .attr("stroke", (group) => z(group))
    .attr("stroke-width", "2")
    .attr("d", (group) => line(group)(points));

  return assets.map((a) => {
    return {
      label: a,
      color: z(a),
      shape: "square",
    };
  });
}
