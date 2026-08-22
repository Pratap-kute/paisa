import * as d3 from "d3";
import dayjs from "dayjs";
import _, { round } from "lodash";
import COLORS from "../core/colors";
import {
  formatCurrency,
  formatFloat,
  type Harvestable,
  restName,
  tooltip,
} from "../core/utils";

export function renderHarvestables(harvestables: Harvestable[]) {
  const id = "#d3-harvestables";
  const root = d3.select(id);

  const card = root
    .selectAll("div.paisa-d3-harvest-column")
    .data(
      _.filter(
        harvestables,
        (harvestable) => harvestable.harvestable_units > 0,
      ),
    )
    .enter()
    .append("div")
    .attr("class", "paisa-d3-harvest-column")
    .append("div")
    .attr("class", "paisa-d3-harvest-card");

  const header = card.append("header").attr("class", "paisa-d3-harvest-header");

  header
    .append("p")
    .attr("class", "paisa-d3-harvest-title")
    .text((h) => restName(h.account));

  header
    .append("div")
    .attr("class", "paisa-d3-harvest-header-action")
    .style("flex-grow", "1")
    .style("cursor", "auto")
    .append("div")
    .attr("class", "harvest-calculator")
    .each(function (h) {
      const self = d3.select(this);
      const [units, amount, taxableGain] = unitsRequiredFromGain(h, 100000);
      self.append("span").html("If you redeem&nbsp;");
      const unitsSpan = self.append("span").text(formatFloat(units));
      self.append("span").html("&nbsp;units you will get ₹");
      const amountInput = self
        .append("input")
        .attr("class", "paisa-harvest-input adjustable-input")
        .attr("type", "number")
        .attr("value", round(amount))
        .attr("step", "1000")
        .on("input", (event) => {
          const [units, amount, taxableGain] = unitsRequiredFromAmount(
            h,
            parseInt(event.srcElement.value),
          );

          unitsSpan.text(formatFloat(units));
          (taxableGainInput.node() as HTMLInputElement).value = round(
            taxableGain,
          ).toString();
          event.srcElement.value = round(amount);
        });
      self.append("span").html(
        "&nbsp; and your <b>taxable</b> gain would be ₹",
      );
      const taxableGainInput = self
        .append("input")
        .attr("class", "paisa-harvest-input adjustable-input")
        .attr("type", "number")
        .attr("value", round(taxableGain))
        .attr("step", "1000")
        .on("input", (event) => {
          const [units, amount, taxableGain] = unitsRequiredFromGain(
            h,
            parseInt(event.srcElement.value),
          );
          unitsSpan.text(formatFloat(units));
          event.srcElement.value = round(taxableGain);
          (amountInput.node() as HTMLInputElement).value = round(amount)
            .toString();
        });
    });

  header
    .append("span")
    .attr("class", "paisa-d3-harvest-header-action")
    .text(
      (harvestable) =>
        "price as on " +
        dayjs(harvestable.current_unit_date).format("DD MMM YYYY"),
    );

  const content = card
    .append("div")
    .attr("class", "paisa-d3-harvest-body")
    .append("div")
    .attr("class", "paisa-d3-harvest-columns");

  const summary = content.append("div").attr("class", "paisa-d3-harvest-summary");

  summary.append("div").each(renderSingleBar);

  summary.append("div").html((h) => {
    return `
<table class="paisa-popup-table">
  <tbody>
    <tr>
      <td>Balance Units</td>
      <td class='paisa-text-right paisa-text-bold'>${
      formatFloat(h.total_units)
    }</td>
    </tr>
    <tr>
      <td>Harvestable Units</td>
      <td class='paisa-text-right paisa-text-bold paisa-text-positive'>${
      formatFloat(
        h.harvestable_units,
      )
    }</td>
    </tr>
    <tr>
      <td>Tax Category</td>
      <td class='paisa-text-right uppercase'>${h.tax_category}</td>
    </tr>
    <tr>
      <td>Current Unit Price</td>
      <td class='paisa-text-right paisa-text-bold'>${
      formatFloat(h.current_unit_price)
    }</td>
    </tr>
    <tr>
      <td>Unrealized Gain / Loss</td>
      <td class='paisa-text-right paisa-text-bold'>${
      formatCurrency(h.unrealized_gain)
    }</td>
    </tr>
    <tr>
      <td>Taxable Unrealized Gain / Loss</td>
      <td class='paisa-text-right paisa-text-bold'>${
      formatCurrency(
        h.taxable_unrealized_gain,
      )
    }</td>
    </tr>
  </tbody>
</table>
`;
  });

  const table = content
    .append("div")
    .attr("class", "paisa-d3-harvest-detail")
    .append("div")
    .attr("class", "table-container")
    .style("overflow-y", "auto")
    .style("max-height", "245px")
    .append("table")
    .attr("class", "paisa-d3-table");

  table.append("thead").html(`
<tr>
  <th>Purchase Date</th>
  <th class='paisa-text-right'>Units</th>
  <th class='paisa-text-right'>Purchase Price</th>
  <th class='paisa-text-right'>Purchase Unit Price</th>
  <th class='paisa-text-right'>Current Price</th>
  <th class='paisa-text-right'>Gain</th>
  <th class='paisa-text-right'>Taxable Gain</th>
  <th class='paisa-text-right'>Short Term Tax</th>
  <th class='paisa-text-right'>Long Term Tax</th>
  <th class='paisa-text-right'>Taxable at Slab Rate</th>
</tr>
`);

  table
    .append("tbody")
    .selectAll("tr")
    .data((harvestable) => {
      return harvestable.harvest_breakdown;
    })
    .enter()
    .append("tr")
    .html((breakdown) => {
      return `
<tr>
  <td style="white-space: nowrap">${
        dayjs(breakdown.purchase_date).format("DD MMM YYYY")
      }</td>
  <td class='paisa-text-right'>${formatFloat(breakdown.units)}</td>
  <td class='paisa-text-right'>${formatCurrency(breakdown.purchase_price)}</td>
  <td class='paisa-text-right'>${formatFloat(breakdown.purchase_unit_price)}</td>
  <td class='paisa-text-right'>${formatCurrency(breakdown.current_price)}</td>
  <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(breakdown.tax.gain)
      }</td>
  <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(breakdown.tax.taxable)
      }</td>
  <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(breakdown.tax.short_term)
      }</td>
  <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(breakdown.tax.long_term)
      }</td>
  <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(breakdown.tax.slab)
      }</td>
</tr>
`;
    });
}

function unitsRequiredFromGain(
  harvestable: Harvestable,
  taxableGain: number,
): [number, number, number] {
  let gain = 0;
  let amount = 0;
  let units = 0;
  const available = _.clone(harvestable.harvest_breakdown);
  while (taxableGain > gain && available.length > 0) {
    const breakdown = available.shift();
    if (breakdown.tax.taxable < taxableGain - gain) {
      gain += breakdown.tax.taxable;
      units += breakdown.units;
      amount += breakdown.current_price;
    } else {
      const u = ((taxableGain - gain) * breakdown.units) /
        breakdown.tax.taxable;
      units += u;
      amount += u * harvestable.current_unit_price;
      gain = taxableGain;
    }
  }
  return [units, amount, gain];
}

function unitsRequiredFromAmount(
  harvestable: Harvestable,
  expectedAmount: number,
): [number, number, number] {
  let gain = 0;
  let amount = 0;
  let units = 0;
  const available = _.clone(harvestable.harvest_breakdown);
  while (expectedAmount > amount && available.length > 0) {
    const breakdown = available.shift();
    if (breakdown.current_price < expectedAmount - amount) {
      gain += breakdown.tax.taxable;
      units += breakdown.units;
      amount += breakdown.current_price;
    } else {
      const u = (expectedAmount - amount) / harvestable.current_unit_price;
      units += u;
      amount = expectedAmount;
      gain += u * (breakdown.tax.taxable / breakdown.units);
    }
  }
  return [units, amount, gain];
}

function renderSingleBar(harvestable: Harvestable) {
  const selection = d3.select(this);
  const svg = selection.append("svg");

  const height = 20;
  const margin = { top: 20, right: 0, bottom: 20, left: 0 },
    width = selection.node().clientWidth - margin.left - margin.right,
    g = svg.append("g").attr(
      "transform",
      "translate(" + margin.left + "," + margin.top + ")",
    );

  svg
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const x = d3.scaleLinear().range([0, width]).domain([
    0,
    harvestable.total_units,
  ]);

  const non_harvestable_units = harvestable.total_units -
    harvestable.harvestable_units;

  g.attr("data-tippy-content", () => {
    return tooltip([
      [
        ["Type", "paisa-text-bold"],
        ["Units", "paisa-text-bold paisa-text-right"],
        ["Percentage", "paisa-text-bold paisa-text-right"],
      ],
      [
        "Harvestable",
        [formatFloat(harvestable.harvestable_units), "paisa-text-right"],
        [
          formatFloat(
            (harvestable.harvestable_units / harvestable.total_units) * 100,
          ),
          "paisa-text-right",
        ],
      ],
      [
        "Non Harvestable",
        [formatFloat(non_harvestable_units), "paisa-text-right"],
        [
          formatFloat((non_harvestable_units / harvestable.total_units) * 100),
          "paisa-text-right",
        ],
      ],
    ]);
  });

  g.selectAll("rect")
    .data([
      { start: 0, end: harvestable.harvestable_units, color: COLORS.gainText },
      {
        start: harvestable.harvestable_units,
        end: harvestable.total_units,
        color: COLORS.tertiary,
      },
    ])
    .join("rect")
    .attr("fill", (d) => d.color)
    .attr("x", (d) => x(d.start))
    .attr("width", (d) => x(d.end) - x(d.start))
    .attr("y", 0)
    .attr("height", height);
}
