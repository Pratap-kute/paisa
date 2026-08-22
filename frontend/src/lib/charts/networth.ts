import * as d3 from "d3";
import { Delaunay } from "d3";
import _ from "lodash";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { financialColors } from "../theme/chartPalette";
import {
  formatCurrency,
  formatCurrencyCrude,
  getColorPreference,
  isMobile,
  type Legend,
  type Networth,
  now,
  svgUrl,
  tooltip,
} from "../core/utils";
import { containerPlotSize } from "./resize";

function networth(d: Networth) {
  return d.investmentAmount + d.gainAmount - d.withdrawalAmount;
}

function investment(d: Networth) {
  return d.investmentAmount - d.withdrawalAmount;
}

export interface NetworthChart {
  update: (points: Networth[]) => void;
  resize: (dimensions: { width: number; height: number }) => void;
  destroy: () => void;
  legends: Legend[];
}

export function createNetworthChart(
  element: Element,
): NetworthChart {
  const svg = d3.select(element);
  svg.selectAll("*").remove();

  const darkMode = getColorPreference() === "dark";
  const right = isMobile() ? 10 : 80;
  const margin = { top: 15, right, bottom: 20, left: 40 };

  let { width: currentWidth, height: currentHeight } = containerPlotSize(
    element,
    margin,
  );
  svg
    .attr("width", currentWidth + margin.left + margin.right)
    .attr("height", currentHeight + margin.top + margin.bottom);

  const g = svg.append("g").attr(
    "transform",
    "translate(" + margin.left + "," + margin.top + ")",
  );

  const areaKeys = ["gain", "loss"];
  const colors = [
    darkMode ? "#22c55e" : financialColors.gain,
    darkMode ? "#f87171" : financialColors.loss,
  ];
  const areaScale = d3.scaleOrdinal<string>().domain(areaKeys).range(colors);

  const lineKeys = ["networth", "investment"];
  const lineScale = d3
    .scaleOrdinal<string>()
    .domain(lineKeys)
    .range([financialColors.networth, financialColors.investment]);

  const x = d3.scaleTime().range([0, currentWidth]);
  const y = d3.scaleLinear().range([currentHeight, 0]);
  const z = d3.scaleOrdinal<string>(colors).domain(areaKeys);

  const xAxis = g.append("g").attr("class", "axis x");
  const yAxisRight = g.append("g").attr("class", "axis y");
  const yAxisLeft = g.append("g").attr("class", "axis y");

  const layer = g.append("g").attr("class", "layer");

  const clipAboveID = _.uniqueId("clip-above");
  const clipAbove = layer
    .append("clipPath")
    .attr("id", clipAboveID)
    .append("path");

  const clipBelowID = _.uniqueId("clip-below");
  const clipBelow = layer
    .append("clipPath")
    .attr("id", clipBelowID)
    .append("path");

  const gainArea = layer
    .append("path")
    .style("fill", z("gain"))
    .style("opacity", "0.2")
    .attr("clip-path", svgUrl(clipAboveID));

  const lossArea = layer
    .append("path")
    .attr("clip-path", svgUrl(clipBelowID))
    .style("fill", z("loss"))
    .style("opacity", "0.2");

  const investmentLine = layer
    .append("path")
    .style("stroke", lineScale("investment"))
    .style("stroke-width", "1.5")
    .style("fill", "none");

  const networthLine = layer
    .append("path")
    .style("stroke", lineScale("networth"))
    .style("stroke-width", "1.5")
    .style("fill", "none");

  const hoverCircle = layer.append("circle").attr("r", "3").attr(
    "fill",
    "none",
  );

  let tippyInstance: TippyInstance | null = null;
  const hoverCircleNode = hoverCircle.node();
  if (hoverCircleNode) {
    tippyInstance = tippy(hoverCircleNode as Element, {
      theme: "light",
      delay: 0,
      allowHTML: true,
    });
  }

  const voronoiGroup = layer.append("g");

  let currentPoints: Networth[] = [];

  const area = (y0: number, y1: (d: Networth) => number) =>
    d3
      .area<Networth>()
      .curve(d3.curveMonotoneX)
      .x((d) => x(d.date))
      .y0(y0)
      .y1(y1);

  function render(points: Networth[]) {
    currentPoints = points;
    if (_.isEmpty(points)) {
      gainArea.attr("d", null);
      lossArea.attr("d", null);
      investmentLine.attr("d", null);
      networthLine.attr("d", null);
      voronoiGroup.selectAll("*").remove();
      return;
    }

    const start = _.min(_.map(points, (p) => p.date)) || now();
    const end = now();

    const positions = _.flatMap(points, (p) => [
      p.gainAmount + p.investmentAmount - p.withdrawalAmount,
      p.investmentAmount - p.withdrawalAmount,
    ]);
    positions.push(0);

    x.domain([start, end]).range([0, currentWidth]);
    y.domain(d3.extent(positions)).range([currentHeight, 0]);

    xAxis
      .attr("transform", "translate(0," + currentHeight + ")")
      .call(d3.axisBottom(x));

    if (!isMobile()) {
      yAxisRight
        .attr("transform", `translate(${currentWidth},0)`)
        .call(d3.axisRight(y).tickPadding(5).tickFormat(formatCurrencyCrude));
    } else {
      yAxisRight.selectAll("*").remove();
    }

    yAxisLeft.call(
      d3.axisLeft(y).tickSize(-currentWidth).tickFormat(formatCurrencyCrude),
    );

    clipAbove.attr(
      "d",
      area(
        currentHeight,
        (d) => y(d.gainAmount + d.investmentAmount - d.withdrawalAmount),
      )(points) || null,
    );

    clipBelow.attr(
      "d",
      area(0, (d) => y(d.gainAmount + d.investmentAmount - d.withdrawalAmount))(
        points,
      ) || null,
    );

    gainArea.attr(
      "d",
      area(0, (d) => y(d.investmentAmount - d.withdrawalAmount))(points) ||
        null,
    );

    lossArea.attr(
      "d",
      area(currentHeight, (d) => y(d.investmentAmount - d.withdrawalAmount))(
        points,
      ) || null,
    );

    investmentLine.attr(
      "d",
      d3
        .line<Networth>()
        .curve(d3.curveMonotoneX)
        .x((d) => x(d.date))
        .y((d) => y(investment(d)))(points) || null,
    );

    networthLine.attr(
      "d",
      d3
        .line<Networth>()
        .curve(d3.curveMonotoneX)
        .x((d) => x(d.date))
        .y((d) => y(networth(d)))(points) || null,
    );

    const networthVoronoiPoints: Delaunay.Point[] = _.map(
      points,
      (d) => [x(d.date), y(networth(d))],
    );
    const investmentVoronoiPoints: Delaunay.Point[] = _.map(points, (d) => [
      x(d.date),
      y(investment(d)),
    ]);

    const voronoi = Delaunay.from(
      networthVoronoiPoints.concat(investmentVoronoiPoints),
    ).voronoi([0, 0, currentWidth, currentHeight]);

    const cellData = points
      .map((p) => ["networth", p])
      .concat(points.map((p) => ["investment", p])) as [string, Networth][];

    voronoiGroup
      .selectAll("path")
      .data(cellData)
      .join("path")
      .style("pointer-events", "all")
      .style("fill", "none")
      .attr("d", (_, i) => voronoi.renderCell(i))
      .on("mouseover", (_, [pointType, d]) => {
        hoverCircle
          .attr("cx", x(d.date))
          .attr("cy", y(pointType == "networth" ? networth(d) : investment(d)))
          .attr("fill", lineScale(pointType));

        if (tippyInstance) {
          tippyInstance.setProps({
            placement: pointType == "networth" ? "top" : "bottom",
            content: tooltip([
              ["Date", d.date.format("DD MMM YYYY")],
              ["Net Worth", [
                formatCurrency(networth(d)),
                "paisa-text-bold paisa-text-right",
              ]],
              [
                "Net Investment",
                [
                  formatCurrency(investment(d)),
                  "paisa-text-bold paisa-text-right",
                ],
              ],
              ["Gain / Loss", [
                formatCurrency(d.gainAmount),
                "paisa-text-bold paisa-text-right",
              ]],
            ]),
          });
          tippyInstance.show();
        }
      })
      .on("mouseout", () => {
        if (tippyInstance) {
          tippyInstance.hide();
        }
        hoverCircle.attr("fill", "none");
      });
  }

  function resize(dimensions: { width: number; height: number }) {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    svg.attr("width", dimensions.width).attr("height", dimensions.height);
    currentWidth = Math.max(50, dimensions.width - margin.left - margin.right);
    currentHeight = Math.max(
      50,
      dimensions.height - margin.top - margin.bottom,
    );
    render(currentPoints);
  }

  const legends: Legend[] = [
    {
      label: "Net Worth",
      color: lineScale("networth"),
      shape: "line",
    },
    {
      label: "Net Investment",
      color: lineScale("investment"),
      shape: "line",
    },
    {
      label: "Gain",
      color: areaScale("gain"),
      shape: "square",
    },
    {
      label: "Loss",
      color: areaScale("loss"),
      shape: "square",
    },
  ];

  return {
    update: render,
    resize,
    destroy: () => {
      tippyInstance?.destroy();
      svg.selectAll("*").remove();
    },
    legends,
  };
}

export function renderNetworth(
  points: Networth[],
  element: Element,
): { destroy: () => void; legends: Legend[] } {
  const chart = createNetworthChart(element);
  chart.update(points);
  return {
    destroy: chart.destroy,
    legends: chart.legends,
  };
}
