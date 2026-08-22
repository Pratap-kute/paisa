import * as d3 from "d3";
import _ from "lodash";
import { formatCurrency, type ScheduleALEntry } from "../core/utils";

export function renderBreakdowns(scheduleALEntries: ScheduleALEntry[]) {
  const tbody = d3.select<HTMLTableSectionElement, unknown>(".d3-schedule-al");
  const trs = tbody.selectAll<HTMLTableRowElement, ScheduleALEntry>("tr").data(
    scheduleALEntries.concat([
      {
        section: { code: "", section: "", details: "Total" },
        amount: _.sumBy(scheduleALEntries, (s) => s.amount),
      },
    ]),
  );

  trs.exit().remove();
  trs
    .enter()
    .append("tr")
    .merge(trs)
    .html((s) => {
      return `
       <td>${s.section.code}</td>
       <td>${s.section.section}</td>
       <td class="${
        s.section.code == "" ? "paisa-text-bold" : ""
      }">${s.section.details}</td>
       <td class='paisa-text-right paisa-text-bold'>${
        formatCurrency(s.amount)
      }</td>
      `;
    });
}
