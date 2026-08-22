import * as d3 from "d3";
import type dayjs from "dayjs";
import _ from "lodash";
import { type Aggregate, type Legend, now, secondName } from "../core/utils";
import { generateColorScheme } from "../core/colors";
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
