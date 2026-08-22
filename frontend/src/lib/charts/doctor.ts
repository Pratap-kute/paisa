import * as d3 from "d3";
import type { Issue } from "../core/utils";

const LEVEL_STYLES: Record<string, { border: string; bg: string; header: string }> = {
  warning: {
    border: "var(--paisa-warning)",
    bg: "var(--paisa-warning-light)",
    header: "var(--paisa-warning)",
  },
  danger: {
    border: "var(--paisa-danger)",
    bg: "var(--paisa-danger-light)",
    header: "var(--paisa-danger)",
  },
  info: {
    border: "var(--paisa-info)",
    bg: "var(--paisa-info-light)",
    header: "var(--paisa-info)",
  },
};

function levelStyle(level: string) {
  return LEVEL_STYLES[level] ?? LEVEL_STYLES.info;
}

export function renderIssues(issues: Issue[]) {
  const id = "#d3-diagnosis";
  const root = d3.select(id);

  const issue = root
    .selectAll("div")
    .data(issues)
    .enter()
    .append("div")
    .attr("class", "w-full p-2 min-[769px]:w-1/2")
    .append("div")
    .attr("class", "overflow-hidden rounded-[var(--paisa-radius-md)] border")
    .style("border-color", (i) => `${levelStyle(i.level).border}33`)
    .style("background-color", (i) => levelStyle(i.level).bg);

  issue
    .append("div")
    .attr("class", "px-4 py-2 text-sm font-semibold text-[var(--paisa-foreground)]")
    .style("border-bottom", (i) => `1px solid ${levelStyle(i.level).border}33`)
    .style("background-color", (i) => `${levelStyle(i.level).header}1a`)
    .html((i) => `<p class="m-0">${i.summary}</p>`);

  issue
    .append("div")
    .attr("class", "px-4 py-3 text-sm text-[var(--paisa-foreground)]")
    .html((i) => `${i.description} <br/> <br/> ${i.details}`);
}
