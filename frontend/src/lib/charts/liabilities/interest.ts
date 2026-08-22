// deno-lint-ignore-file no-explicit-any -- D3 stack callback datum types are augmented at runtime.
import chroma from "chroma-js";
import * as d3 from "d3";
import type dayjs from "dayjs";
import _ from "lodash";
import COLORS from "../../core/colors";
import {
  formatCurrency,
  formatCurrencyCrude,
  formatFloat,
  type Interest,
  type InterestOverview,
  type Legend,
  rem,
  restName,
  skipTicks,
  tooltip,
} from "../../core/utils";
import {
  createRedrawChart,
  plotSize,
  type ChartHandle,
  type Dimensions,
} from "../resize";
import { svgRectSpan } from "../svg";

const areaKeys = ["gain", "loss"];
const colors = [COLORS.gain, COLORS.loss];
const areaScale = d3.scaleOrdinal<string>().domain(areaKeys).range(colors);
const lineKeys = ["balance", "drawn", "repaid"];
const lineScale = d3
  .scaleOrdinal<string>()
  .domain(lineKeys)
  .range([COLORS.primary, COLORS.secondary, COLORS.tertiary]);

export function padTimeDomain(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
): [dayjs.Dayjs, dayjs.Dayjs] {
  if (start.isSame(end)) {
    return [start.subtract(1, "day"), end.add(1, "day")];
  }
  return [start, end];
}

export function timelineDomain(
  points: InterestOverview[],
): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const dates = points.map((point) => point.date).filter(Boolean);
  const start = _.min(dates);
  const end = _.max(dates);
  if (!start || !end) return null;
  return padTimeDomain(start, end);
}

function clipUrl(id: string) {
  return `url(#${id})`;
}

export function renderTable(interest: Interest) {
  const tbody = d3.select(this);
  const current = _.last(interest.overview_timeline);
  const drawn = current?.drawn_amount ?? 0;
  const repaid = current?.repaid_amount ?? 0;
  const interestAmount = current?.interest_amount ?? 0;
  tbody.html(function () {
    return `
<tr>
  <td>Account</td>
  <td class='paisa-text-right paisa-text-bold'>${
      restName(interest.account)
    }</td>
</tr>
<tr>
  <td>Loan Drawn</td>
  <td class='paisa-text-right'>${formatCurrency(drawn)}</td>
</tr>
<tr>
  <td>Loan Repaid</td>
  <td class='paisa-text-right'>${formatCurrency(repaid)}</td>
</tr>
<tr>
  <td>Interest</td>
  <td class='paisa-text-right'>${formatCurrency(interestAmount)}</td>
</tr>
<tr>
  <td>Balance</td>
  <td class='paisa-text-right'>${formatCurrency(drawn + interestAmount - repaid)}</td>
</tr>
<tr>
  <td>APR</td>
  <td class='paisa-text-right'>${formatFloat(interest.apr)}</td>
</tr>
`;
  });
}

function applySvgDimensions(
  svg: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>,
  width: number,
  height: number,
) {
  svg
    .attr("width", width)
    .attr("height", height)
    .style("width", `${width}px`)
    .style("height", `${height}px`);
}

function svgOuterWidth(
  plotWidth: number,
  margin: { left: number; right: number },
) {
  return plotWidth + margin.left + margin.right;
}

function svgOuterHeight(
  plotHeight: number,
  margin: { top: number; bottom: number },
) {
  return plotHeight + margin.top + margin.bottom;
}

export function maxOverviewY(points: InterestOverview[]): number {
  return d3.max(points, (d) =>
    Math.max(
      d.drawn_amount + d.interest_amount,
      d.repaid_amount,
      d.drawn_amount + d.interest_amount - d.repaid_amount,
    )
  ) ?? 0;
}

export function renderOverview(gains: Interest[], size: Dimensions = { width: 0, height: 0 }) {
  const id = "#d3-interest-overview";
  const svg = d3.select(id);
  if (_.isEmpty(gains)) {
    svg.selectAll("*").remove();
    return;
  }

  gains = _.sortBy(gains, (g) => g.account);
  const BAR_HEIGHT = rem(24);
  const el = document.getElementById(id.substring(1));
  if (!el?.parentElement) return;

  svg.selectAll("*").remove();

  const margin = {
      top: rem(25),
      right: rem(20),
      bottom: rem(30),
      left: rem(150),
    },
    { width } = plotSize(el, margin, size, {
      minWidth: rem(1100),
    }),
    height = gains.length * BAR_HEIGHT * 2,
    g = svg.append("g").attr(
      "transform",
      "translate(" + margin.left + "," + margin.top + ")",
    );
  applySvgDimensions(
    svg,
    svgOuterWidth(width, margin),
    svgOuterHeight(height, margin),
  );

  const y = d3.scaleBand().range([0, height]).paddingInner(0.1).paddingOuter(
    0.05,
  );
  y.domain(gains.map((g) => restName(g.account)));
  const y1 = d3
    .scaleBand()
    .range([0, y.bandwidth()])
    .domain(["0", "1"])
    .paddingInner(0)
    .paddingOuter(0.1);

  const y2 = d3
    .scaleBand()
    .range([0, y.bandwidth()])
    .domain(["0", "1"])
    .paddingInner(0.15)
    .paddingOuter(0.3);

  const keys = ["balance", "drawn", "repaid", "gain", "loss"];
  const colors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.tertiary,
    COLORS.gain,
    COLORS.loss,
  ];
  const z = d3.scaleOrdinal<string>(colors).domain(keys);

  const getCurrentOverview = (g: Interest) => _.last(g.overview_timeline);

  const getDrawnAmount = (g: Interest) =>
    getCurrentOverview(g)?.drawn_amount ?? 0;

  const getInterestAmount = (g: Interest) =>
    getCurrentOverview(g)?.interest_amount ?? 0;
  const getRepaidAmount = (g: Interest) =>
    getCurrentOverview(g)?.repaid_amount ?? 0;

  const getBalanceAmount = (g: Interest) => {
    const current = getCurrentOverview(g);
    if (!current) return 0;
    return current.drawn_amount + current.interest_amount -
      current.repaid_amount;
  };

  const maxX = _.chain(gains)
    .map((g) => getDrawnAmount(g) + _.max([getInterestAmount(g), 0]))
    .max()
    .value() || 0;
  const textColWidth = rem(120);
  const textGroupWidth = textColWidth * 3;
  const aprWidth = rem(200);
  const aprTextWidth = rem(40);
  const aprMargin = rem(20);
  const textGroupMargin = rem(20);
  const textGroupZero = aprWidth + aprTextWidth + aprMargin;

  const x = d3.scaleLinear().range([
    textGroupZero + textGroupWidth + textGroupMargin,
    width,
  ]);
  x.domain([0, maxX > 0 ? maxX : 1]);
  const x1 = d3
    .scaleLinear()
    .range([0, aprWidth])
    .domain([
      _.min([_.min(_.map(gains, (g) => g.apr)) ?? 0, 0]) ?? 0,
      _.max([0, _.max(_.map(gains, (g) => g.apr)) ?? 0]) || 1,
    ]);

  g.append("line")
    .classed("svg-grey-lighter", true)
    .attr("x1", aprWidth + aprTextWidth + aprMargin / 2)
    .attr("y1", 0)
    .attr("x2", aprWidth + aprTextWidth + aprMargin / 2)
    .attr("y2", height);

  g.append("line")
    .classed("svg-grey-lighter", true)
    .attr("x1", 0)
    .attr("y1", height)
    .attr("x2", width)
    .attr("y2", height);

  g.append("text")
    .classed("svg-text-grey", true)
    .text("APR")
    .attr("text-anchor", "middle")
    .attr("x", aprWidth / 2)
    .attr("y", -8);

  g.append("text")
    .classed("svg-text-grey", true)
    .text("Loan Drawn")
    .attr("text-anchor", "middle")
    .attr("x", textGroupZero + textColWidth * 0.5)
    .attr("y", -8);

  g.append("text")
    .classed("svg-text-grey", true)
    .text("Interest")
    .attr("text-anchor", "middle")
    .attr("x", textGroupZero + textColWidth * 1.5)
    .attr("y", -8);

  g.append("text")
    .classed("svg-text-grey", true)
    .text("Balance / Repaid")
    .attr("text-anchor", "middle")
    .attr("x", textGroupZero + textColWidth * 2.5)
    .attr("y", -8);

  g.append("g")
    .attr("class", "axis y")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x)
        .tickSize(-height)
        .tickFormat(skipTicks(60, x, formatCurrencyCrude)),
    );

  g.append("g")
    .attr("class", "axis y")
    .attr("transform", "translate(0," + height + ")")
    .call(
      d3
        .axisBottom(x1)
        .tickSize(-height)
        .tickFormat(skipTicks(40, x1, (n: number) => formatFloat(n, 1))),
    );

  g.append("g").attr("class", "axis y dark").call(d3.axisLeft(y));

  const textGroup = g
    .append("g")
    .selectAll("g")
    .data(gains)
    .enter()
    .append("g")
    .attr("class", "inline-text");

  textGroup
    .append("text")
    .text((g) => formatCurrency(getDrawnAmount(g)))
    .attr("dominant-baseline", "hanging")
    .attr("text-anchor", "end")
    .style("fill", (g) => (getDrawnAmount(g) > 0 ? z("drawn") : "none"))
    .attr("dx", "-3")
    .attr("dy", "3")
    .attr("x", textGroupZero + textColWidth)
    .attr("y", (g) => y(restName(g.account)));

  textGroup
    .append("text")
    .text((g) => formatCurrency(getInterestAmount(g)))
    .attr("dominant-baseline", "hanging")
    .attr("text-anchor", "end")
    .style(
      "fill",
      (
        g,
      ) => (getInterestAmount(g) > 0
        ? chroma(z("loss")).darken().hex()
        : "none"),
    )
    .attr("dx", "-3")
    .attr("dy", "3")
    .attr("x", textGroupZero + textColWidth * 2)
    .attr("y", (g) => y(restName(g.account)));

  textGroup
    .append("text")
    .text((g) => formatCurrency(getBalanceAmount(g)))
    .attr("text-anchor", "end")
    .style("fill", (g) => (getBalanceAmount(g) > 0 ? z("balance") : "none"))
    .attr("dx", "-3")
    .attr("dy", "-3")
    .attr("x", textGroupZero + textColWidth)
    .attr("y", (g) => y(restName(g.account)) + y.bandwidth());

  textGroup
    .append("text")
    .text((g) => formatCurrency(getInterestAmount(g)))
    .attr("text-anchor", "end")
    .style(
      "fill",
      (
        g,
      ) => (getInterestAmount(g) < 0
        ? chroma(z("gain")).darken().hex()
        : "none"),
    )
    .attr("dx", "-3")
    .attr("dy", "-3")
    .attr("x", textGroupZero + textColWidth * 2)
    .attr("y", (g) => y(restName(g.account)) + y.bandwidth());

  textGroup
    .append("text")
    .text((g) => formatCurrency(getRepaidAmount(g)))
    .attr("text-anchor", "end")
    .style("fill", (g) => (getRepaidAmount(g) > 0 ? z("repaid") : "none"))
    .attr("dx", "-3")
    .attr("dy", "-3")
    .attr("x", textGroupZero + textColWidth * 3)
    .attr("y", (g) => y(restName(g.account)) + y.bandwidth());

  textGroup
    .append("line")
    .classed("svg-grey-lighter", true)
    .attr("x1", 0)
    .attr("y1", (g) => y(restName(g.account)))
    .attr("x2", width)
    .attr("y2", (g) => y(restName(g.account)));

  textGroup
    .append("text")
    .text((g) => formatFloat(g.apr))
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .style(
      "fill",
      (g) =>
        g.apr < 0
          ? chroma(z("loss")).darken().hex()
          : chroma(z("gain")).darken().hex(),
    )
    .attr("x", aprWidth + aprTextWidth)
    .attr("y", (g) => y(restName(g.account)) + y.bandwidth() / 2);

  const groups = g
    .append("g")
    .selectAll("g.group")
    .data(gains)
    .enter()
    .append("g")
    .attr("class", "group")
    .attr("transform", (g) => "translate(0," + y(restName(g.account)) + ")");

  groups
    .selectAll("g")
    .data((g) => [
      d3.stack().keys(["drawn", "loss"])([
        {
          i: "0",
          data: g,
          drawn: getDrawnAmount(g),
          loss: _.max([getInterestAmount(g), 0]),
        },
      ] as any),
      d3.stack().keys(["balance", "gain", "repaid"])([
        {
          i: "1",
          data: g,
          balance: getBalanceAmount(g),
          repaid: getRepaidAmount(g),
          gain: Math.abs(_.min([getInterestAmount(g), 0])),
        },
      ] as any),
    ])
    .enter()
    .append("g")
    .selectAll("rect")
    .data((d) => {
      return d;
    })
    .enter()
    .append("rect")
    .attr("rx", "5")
    .attr("fill", (d) => {
      return z(d.key);
    })
    .attr("stroke", (d) => {
      return z(d.key);
    })
    .attr("stroke-opacity", (d) => (_.includes(areaKeys, d.key) ? 0.0 : 0.4))
    .attr("fill-opacity", (d) => (_.includes(areaKeys, d.key) ? 1 : 0.6))
    .attr("x", (d) => svgRectSpan(x(d[0][0]), x(d[0][1])).x)
    .attr("y", (d: any) => y2(d[0].data.i))
    .attr("height", y2.bandwidth())
    .attr("width", (d) => svgRectSpan(x(d[0][0]), x(d[0][1])).width);

  const paddingTop = (y1.range()[1] - y1.bandwidth() * 2) / 2;
  g.append("g")
    .selectAll("rect")
    .data(gains)
    .enter()
    .append("rect")
    .attr("fill", (g) => (g.apr < 0 ? z("loss") : z("gain")))
    .attr("x", (g) => (g.apr < 0 ? x1(g.apr) : x1(0)))
    .attr("y", (g) => y(restName(g.account)) + paddingTop)
    .attr("height", y.bandwidth() - paddingTop * 2)
    .attr("width", (g) => Math.abs(x1(0) - x1(g.apr)));

  g.append("g")
    .selectAll("rect")
    .data(gains)
    .enter()
    .append("rect")
    .attr("fill", "transparent")
    .attr("data-tippy-content", (g: Interest) => {
      const current = getCurrentOverview(g);
      if (!current) return "";
      return tooltip([
        ["Account", [g.account, "paisa-text-bold paisa-text-right"]],
        [
          "Loan Drawn",
          [
            formatCurrency(current.drawn_amount),
            "paisa-text-bold paisa-text-right",
          ],
        ],
        [
          "Loan Repaid",
          [
            formatCurrency(current.repaid_amount),
            "paisa-text-bold paisa-text-right",
          ],
        ],
        [
          "Interest",
          [
            formatCurrency(current.interest_amount),
            "paisa-text-bold paisa-text-right",
          ],
        ],
        [
          "Balance",
          [
            formatCurrency(
              current.drawn_amount + current.interest_amount -
                current.repaid_amount,
            ),
            "paisa-text-bold paisa-text-right",
          ],
        ],
        ["APR", [formatFloat(g.apr), "paisa-text-bold paisa-text-right"]],
      ]);
    })
    .attr("x", 0)
    .attr("y", (g) => y(restName(g.account)))
    .attr("height", y.bandwidth())
    .attr("width", width);
}

function measuredHeight(node: HTMLElement | null): number {
  if (!node) return 0;
  return node.offsetHeight || node.getBoundingClientRect().height || 0;
}

function measuredWidth(node: HTMLElement | null): number {
  if (!node) return 0;
  const layoutWidth = node.clientWidth || node.getBoundingClientRect().width || 0;
  if (layoutWidth > 0) return layoutWidth;
  const inlineWidth = Number.parseInt(node.style.width, 10);
  return Number.isFinite(inlineWidth) ? inlineWidth : 0;
}

export function renderPerAccountOverview(interests: Interest[]) {
  const root = d3.select("#d3-interest-timeline-breakdown");
  interests = _.filter(interests, (g) => !_.isEmpty(g.overview_timeline));
  if (_.isEmpty(interests)) {
    root.selectAll("*").remove();
    return;
  }

  const sorted = _.sortBy(interests, (g) => g.account);

  root.selectAll("*").remove();

  for (const interest of sorted) {
    const domain = timelineDomain(interest.overview_timeline);
    if (!domain) continue;

    const row = root.append("div").attr("class", "paisa-interest-account-row");
    const summaryCard = row
      .append("div")
      .attr("class", "box paisa-interest-summary-card");
    const tbody = summaryCard
      .append("table")
      .attr(
        "class",
        "paisa-popup-table paisa-interest-summary-table",
      )
      .append("tbody");
    const tbodyNode = tbody.node();
    if (tbodyNode) {
      renderTable.call(tbodyNode, interest);
    }

    const summaryNode = summaryCard.node() as HTMLElement | null;
    const naturalSummaryHeight = measuredHeight(summaryNode);
    const summaryHeight = naturalSummaryHeight > 0 ? naturalSummaryHeight : 150;
    const rootWidth = measuredWidth(root.node() as HTMLElement | null);

    const chartCard = row
      .append("div")
      .attr("class", "box paisa-interest-chart-card");
    const chartNode = chartCard.node() as HTMLElement | null;
    const svgNode = chartCard.append("svg").node();
    if (svgNode && summaryNode && chartNode) {
      const chartWidth = measuredWidth(chartNode) || rootWidth;
      renderOverviewSmall(interest.overview_timeline, svgNode, domain, {
        width: chartWidth,
        height: summaryHeight,
      });
    }
  }
}

function chartCardInnerHeight(
  chartCard: HTMLElement | null,
  outerHeight: number,
): number {
  if (outerHeight <= 0) {
    return 50;
  }
  if (!chartCard) {
    return Math.max(50, outerHeight);
  }
  const styles = getComputedStyle(chartCard);
  const paddingY = parseFloat(styles.paddingTop) +
    parseFloat(styles.paddingBottom);
  return Math.max(50, outerHeight - paddingY);
}

function renderOverviewSmall(
  points: InterestOverview[],
  element: Element,
  xDomain: [dayjs.Dayjs, dayjs.Dayjs],
  size: Dimensions = { width: 0, height: 0 },
) {
  const svg = d3.select(element);
  if (
    !element?.parentElement || _.isEmpty(points) || !xDomain[0] || !xDomain[1]
  ) {
    svg.selectAll("*").remove();
    return;
  }

  svg.selectAll("*").remove();

  const margin = { top: 5, right: 80, bottom: 20, left: 40 };
  const chartCard = element.parentElement as HTMLElement | null;
  const innerHeight = chartCardInnerHeight(
    chartCard,
    size.height > 0 ? size.height : chartCard?.clientHeight ?? 150,
  );
  const { width } = plotSize(element, margin, size);
  const height = Math.max(30, innerHeight - margin.top - margin.bottom);
  const g = svg.append("g").attr(
    "transform",
    "translate(" + margin.left + "," + margin.top + ")",
  );

  applySvgDimensions(
    svg,
    svgOuterWidth(width, margin),
    svgOuterHeight(height, margin),
  );

  const maxY = maxOverviewY(points);

  const x = d3.scaleTime().range([0, width]).domain(xDomain),
    y = d3
      .scaleLinear()
      .range([height, 0])
      .domain([0, maxY > 0 ? maxY : 1]),
    z = d3.scaleOrdinal<string>(colors).domain(areaKeys);

  const area = (y0: number, y1: (d: InterestOverview) => number) =>
    d3
      .area<InterestOverview>()
      .curve(d3.curveMonotoneX)
      .x((d) => x(d.date))
      .y0(y0)
      .y1(y1);

  g.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  g.append("g")
    .attr("class", "axis y")
    .attr("transform", `translate(${width},0)`)
    .call(
      d3.axisRight(y).ticks(5).tickPadding(5).tickFormat(formatCurrencyCrude),
    );

  g.append("g")
    .attr("class", "axis y")
    .call(
      d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(formatCurrencyCrude),
    );

  const layer = g.selectAll(".layer").data([points]).enter().append("g").attr(
    "class",
    "layer",
  );

  const clipAboveID = _.uniqueId("clip-above");
  layer
    .append("clipPath")
    .attr("id", clipAboveID)
    .append("path")
    .attr(
      "d",
      area(height, (d) => {
        return y(d.repaid_amount - d.interest_amount);
      }),
    );

  const clipBelowID = _.uniqueId("clip-below");
  layer
    .append("clipPath")
    .attr("id", clipBelowID)
    .append("path")
    .attr(
      "d",
      area(0, (d) => {
        return y(d.repaid_amount - d.interest_amount);
      }),
    );

  layer
    .append("path")
    .attr("clip-path", clipUrl(clipAboveID))
    .style("fill", z("gain"))
    .style("opacity", "0.8")
    .attr(
      "d",
      area(0, (d) => {
        return y(d.repaid_amount);
      }),
    );

  layer
    .append("path")
    .attr("clip-path", clipUrl(clipBelowID))
    .style("fill", z("loss"))
    .style("opacity", "0.8")
    .attr(
      "d",
      area(height, (d) => {
        return y(d.repaid_amount);
      }),
    );

  layer
    .append("path")
    .style("stroke", lineScale("drawn"))
    .style("fill", "none")
    .attr(
      "d",
      d3
        .line<InterestOverview>()
        .curve(d3.curveMonotoneX)
        .x((d) => x(d.date))
        .y((d) => y(d.drawn_amount)),
    );

  layer
    .append("path")
    .style("stroke", lineScale("repaid"))
    .style("fill", "none")
    .attr(
      "d",
      d3
        .line<InterestOverview>()
        .curve(d3.curveMonotoneX)
        .defined((d) => d.repaid_amount > 0)
        .x((d) => x(d.date))
        .y((d) => y(d.repaid_amount)),
    );

  layer
    .append("path")
    .style("stroke", lineScale("balance"))
    .style("fill", "none")
    .attr(
      "d",
      d3
        .line<InterestOverview>()
        .curve(d3.curveMonotoneX)
        .x((d) => x(d.date))
        .y((d) => y(d.drawn_amount + d.interest_amount - d.repaid_amount)),
    );
}

export function buildLegends(): Legend[] {
  return areaKeys
    .map(
      (key) =>
        ({
          label: key,
          color: areaScale(key),
          shape: "square",
        }) as Legend,
    )
    .concat(
      lineKeys.map(
        (key) =>
          ({
            label: key,
            color: lineScale(key),
            shape: "square",
          }) as Legend,
      ),
    );
}

export function createInterestOverviewChart(): ChartHandle<Interest[]> {
  return createRedrawChart({
    draw: (data, size) => {
      renderOverview(data, size);
    },
    clear: () => {
      d3.select("#d3-interest-overview").selectAll("*").remove();
    },
  });
}

export function createInterestPerAccountChart(): ChartHandle<Interest[]> {
  return {
    update(data) {
      renderPerAccountOverview(data);
    },
    resize() {
      // Per-account rows are content-sized; frame resize must not rebuild charts.
    },
    destroy() {
      d3.select("#d3-interest-timeline-breakdown").selectAll("*").remove();
    },
  };
}
