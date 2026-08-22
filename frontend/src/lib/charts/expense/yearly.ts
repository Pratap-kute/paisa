// deno-lint-ignore-file no-explicit-any -- D3 timeline callback datum types are augmented at runtime.
import * as d3 from "d3";
import type { Dayjs } from "dayjs";
import _ from "lodash";
import {
  financialYear,
  forEachFinancialYear,
  formatCurrency,
  formatCurrencyCrude,
  type Legend,
  now,
  type Posting,
  skipTicks,
  tooltip,
} from "../../core/utils";
import { generateColorScheme } from "../../core/colors";
import type { Writable } from "svelte/store";
import { iconify } from "../../core/icon";
import { expenseGroup } from "../expense";
export function renderYearlyExpensesTimeline(
  postings: Posting[],
  groupsStore: Writable<string[]>,
  yearStore: Writable<string>,
) {
  if (_.isEmpty(postings)) {
    return { z: null, legends: [], resize: () => {} };
  }

  const id = "#d3-yearly-expense-timeline";
  const MAX_BAR_WIDTH = 40;
  const el = document.getElementById(id.substring(1));
  if (!el?.parentElement) return { z: null, legends: [], resize: () => {} };

  const svg = d3.select(id),
    margin = { top: 15, right: 30, bottom: 60, left: 40 };
  let width = el.parentElement.clientWidth -
    margin.left -
    margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr(
      "transform",
      "translate(" + margin.left + "," + margin.top + ")",
    );

  const groups = _.chain(postings).map(expenseGroup).uniq().sort().value();

  const defaultValues = _.zipObject(
    groups,
    _.map(groups, () => 0),
  );

  const start = _.min(_.map(postings, (p) => p.date)),
    end = now().startOf("month");
  const ms = _.groupBy(postings, (p) => financialYear(p.date));

  interface Point {
    fy: string;
    timestamp: Dayjs;
    [key: string]: number | string | Dayjs;
  }

  const points: Point[] = [];

  forEachFinancialYear(start, end, (year) => {
    const postings = ms[financialYear(year)] || [];
    const values = _.chain(postings)
      .groupBy(expenseGroup)
      .map((postings, key) => [key, _.sum(_.map(postings, (p) => p.amount))])
      .fromPairs()
      .value();

    points.push(
      _.merge(
        {
          timestamp: year,
          fy: financialYear(year),
          postings: postings,
          trend: {},
        },
        defaultValues,
        values,
      ),
    );
  });

  const x = d3.scaleBand().range([0, width]).paddingInner(0.1).paddingOuter(0);
  const y = d3.scaleLinear().range([height, 0]);

  const z = generateColorScheme(groups);

  const tooltipContent = (allowedGroups: string[]) => {
    return (d: d3.SeriesPoint<Record<string, number>>) => {
      let grandTotal = 0;
      return tooltip(
        _.flatMap(allowedGroups, (key) => {
          const total = (d.data as any)[key];
          if (total > 0) {
            grandTotal += total;
            return [
              [
                iconify(key, { group: "Expenses" }),
                [formatCurrency(total), "paisa-text-bold paisa-text-right"],
              ],
            ];
          }
          return [];
        }),
        {
          total: formatCurrency(grandTotal),
          header: financialYear(d.data.timestamp as any),
        },
      );
    };
  };

  const xAxis = g.append("g").attr("class", "axis x");
  const yAxis = g.append("g").attr("class", "axis y");

  const bars = g.append("g");

  const render = (allowedGroups: string[]) => {
    groupsStore.set(allowedGroups);
    const sum = (p: Point) => _.sum(_.map(allowedGroups, (k) => p[k]));
    x.domain(points.map((p) => p.fy));
    const maxY = d3.max(points, sum) ?? 0;
    y.domain([0, maxY > 0 ? maxY : 1]);

    const t = svg.transition().duration(750);
    xAxis
      .attr("transform", "translate(0," + height + ")")
      .transition(t)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat(skipTicks(30, x, (d) => d.toString())),
      )
      .selectAll("text")
      .attr("y", 10)
      .attr("x", -8)
      .attr("dy", ".35em")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    yAxis.transition(t).call(
      d3.axisLeft(y).tickSize(-width).tickFormat(formatCurrencyCrude),
    );

    bars
      .selectAll("g")
      .data(
        d3.stack().offset(d3.stackOffsetDiverging).keys(allowedGroups)(
          points as { [key: string]: number }[],
        ),
        (d: any) => d.key,
      )
      .join(
        (enter) =>
          enter.append("g").attr("fill", function (d) {
            return z(d.key);
          }),
        (update) => update.transition(t),
        (exit) =>
          exit.selectAll("rect").transition(t).attr("y", y.range()[0]).attr(
            "height",
            0,
          ).remove(),
      )
      .selectAll("rect")
      .data(function (d) {
        return d;
      })
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "zoomable")
            .on("click", (_event, data) => {
              const timestamp: Dayjs = data.data.timestamp as any;
              yearStore.set(financialYear(timestamp));
            })
            .attr("data-tippy-content", tooltipContent(allowedGroups))
            .attr("x", function (d) {
              return (
                x((d.data as any).fy) +
                (x.bandwidth() - Math.min(x.bandwidth(), MAX_BAR_WIDTH)) / 2
              );
            })
            .attr("width", Math.min(x.bandwidth(), MAX_BAR_WIDTH))
            .attr("y", y.range()[0])
            .transition(t)
            .attr("y", function (d) {
              return y(d[1]);
            })
            .attr("height", function (d) {
              return y(d[0]) - y(d[1]);
            }),
        (update) =>
          update
            .attr("data-tippy-content", tooltipContent(allowedGroups))
            .transition(t)
            .attr("y", function (d) {
              return y(d[1]);
            })
            .attr("height", function (d) {
              return y(d[0]) - y(d[1]);
            }),
        (exit) => exit.transition(t).remove(),
      );
  };

  let selectedGroups = groups;
  render(selectedGroups);

  const legends = groups.map(
    (group) =>
      ({
        label: iconify(group, { group: "Expenses" }),
        color: z(group),
        shape: "square",
        onClick: () => {
          if (selectedGroups.length == 1 && selectedGroups[0] == group) {
            selectedGroups = groups;
          } else {
            selectedGroups = [group];
          }

          render(selectedGroups);
        },
      }) as Legend,
  );

  const resize = (dimensions: { width: number; height: number }) => {
    width = Math.max(0, dimensions.width - margin.left - margin.right);
    x.range([0, width]);
    svg.attr("width", width + margin.left + margin.right);
    render(selectedGroups);
  };

  return { z, legends, resize };
}
