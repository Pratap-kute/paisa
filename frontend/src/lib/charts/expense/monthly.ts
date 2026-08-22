// deno-lint-ignore-file no-explicit-any -- D3 timeline callback datum types are augmented at runtime.
import * as d3 from "d3";
import type { Dayjs } from "dayjs";
import _ from "lodash";
import {
  forEachMonth,
  formatCurrency,
  formatCurrencyCrude,
  type Legend,
  type Posting,
  rem,
  skipTicks,
  tooltip,
} from "../../core/utils";
import COLORS, { generateColorScheme, white } from "../../core/colors";
import {
  get,
  type Readable,
  type Unsubscriber,
  type Writable,
} from "svelte/store";
import { iconify } from "../../core/icon";
import { expenseGroup } from "../expense";
export function renderMonthlyExpensesTimeline(
  postings: Posting[],
  groupsStore: Writable<string[]>,
  monthStore: Writable<string>,
  dateRangeStore: Readable<{ from: Dayjs; to: Dayjs }>,
): {
  z: d3.ScaleOrdinal<string, string, never>;
  destroy: Unsubscriber;
  legends: Legend[];
  resize: (dimensions: { width: number; height: number }) => void;
} {
  const id = "#d3-monthly-expense-timeline";
  const timeFormat = "MMM-YYYY";
  const MAX_BAR_WIDTH = rem(40);
  const el = document.getElementById(id.substring(1));
  if (!el?.parentElement) {
    return {
      z: d3.scaleOrdinal<string, string, never>(),
      destroy: () => {},
      legends: [],
      resize: () => {},
    };
  }

  const svg = d3.select(id),
    margin = { top: rem(15), right: rem(30), bottom: rem(60), left: rem(40) };
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

  const z = generateColorScheme(groups);

  const [start, end] = d3.extent(_.map(postings, (p) => p.date));

  if (!start) {
    return {
      z: z,
      destroy: () => {
        // void
      },
      legends: [],
      resize: () => {},
    };
  }

  const ms = _.groupBy(postings, (p) => p.date.format(timeFormat));
  const ys = _.chain(postings)
    .groupBy((p) => p.date.format("YYYY"))
    .map((ps, k) => {
      const trend = _.chain(ps)
        .groupBy(expenseGroup)
        .map((ps, g) => {
          let months = 12;
          if (start.format("YYYY") == k) {
            months -= start.month();
          }

          if (end.format("YYYY") == k) {
            months -= 11 - end.month();
          }

          return [g, _.sum(_.map(ps, (p) => p.amount)) / months];
        })
        .fromPairs()
        .value();

      return [k, _.merge({}, defaultValues, trend)];
    })
    .fromPairs()
    .value();

  interface Point {
    month: string;
    timestamp: Dayjs;
    [key: string]: number | string | Dayjs;
  }

  const points: Point[] = [];

  forEachMonth(start, end, (month) => {
    const postings = ms[month.format(timeFormat)] || [];
    const values = _.chain(postings)
      .groupBy(expenseGroup)
      .map((postings, key) => [key, _.sum(_.map(postings, (p) => p.amount))])
      .fromPairs()
      .value();

    points.push(
      _.merge(
        {
          timestamp: month,
          month: month.format(timeFormat),
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
          header: (d.data.timestamp as any).format("MMM YYYY"),
        },
      );
    };
  };

  const xAxis = g.append("g").attr("class", "axis x");
  const yAxis = g.append("g").attr("class", "axis y");

  const bars = g.append("g");
  const line1 = g
    .append("path")
    .attr("fill", "none")
    .attr("stroke", white())
    .attr("stroke-width", "2px")
    .attr("stroke-linecap", "round");

  const line2 = g
    .append("path")
    .attr("fill", "none")
    .attr("stroke", COLORS.expenses)
    .attr("stroke-width", "2px")
    .attr("stroke-linecap", "round")
    .attr("stroke-dasharray", "4 6");

  let firstRender = true;

  const render = (
    allowedGroups: string[],
    dateRange: { from: Dayjs; to: Dayjs },
  ) => {
    groupsStore.set(allowedGroups);
    const allowedPoints = _.filter(
      points,
      (p) =>
        p.timestamp.isSameOrBefore(dateRange.to) &&
        p.timestamp.isSameOrAfter(dateRange.from),
    );
    const sum = (p: Point) => _.sum(_.map(allowedGroups, (k) => p[k]));
    x.domain(allowedPoints.map((p) => p.month));
    const maxY = d3.max(allowedPoints, sum) ?? 0;
    y.domain([0, maxY > 0 ? maxY : 1]);

    const t = svg.transition().duration(firstRender ? 0 : 750);
    firstRender = false;
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

    const path = d3
      .line<Point>()
      .curve(d3.curveStepAfter)
      .x((p) => x(p.month))
      .y((p) => {
        const total = _.chain(ys[p.timestamp.format("YYYY")])
          .pick(allowedGroups)
          .values()
          .sum()
          .value();

        return y(total);
      })(allowedPoints);

    line1.attr("d", path);
    line2.attr("d", path);

    bars
      .selectAll("g")
      .data(
        d3.stack().offset(d3.stackOffsetDiverging).keys(allowedGroups)(
          allowedPoints as { [key: string]: number }[],
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
      .data(
        (d) => d,
        (d: any) => d.data.timestamp.format("YYYY-MM"),
      )
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("class", "zoomable")
            .on("click", (_event, data) => {
              const timestamp: Dayjs = data.data.timestamp as any;
              monthStore.set(timestamp.format("YYYY-MM"));
            })
            .attr("data-tippy-content", tooltipContent(allowedGroups))
            .attr("x", function (d) {
              return (
                x((d.data as any).month) +
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
            .attr("width", Math.min(x.bandwidth(), MAX_BAR_WIDTH))
            .attr("x", function (d) {
              return (
                x((d.data as any).month) +
                (x.bandwidth() - Math.min(x.bandwidth(), MAX_BAR_WIDTH)) / 2
              );
            })
            .attr("y", function (d) {
              return y(d[1]);
            })
            .attr("height", function (d) {
              return y(d[0]) - y(d[1]);
            }),
        (exit) => exit.remove(),
      );
  };

  let selectedGroups = groups;
  render(selectedGroups, get(dateRangeStore));

  const destroy = dateRangeStore.subscribe((dateRange) =>
    render(get(groupsStore), dateRange)
  );

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

          render(selectedGroups, get(dateRangeStore));
        },
      }) as Legend,
  );

  const resize = (dimensions: { width: number; height: number }) => {
    width = Math.max(0, dimensions.width - margin.left - margin.right);
    x.range([0, width]);
    svg.attr("width", width + margin.left + margin.right);
    render(selectedGroups, get(dateRangeStore));
  };

  return { z: z, destroy: destroy, legends, resize };
}
