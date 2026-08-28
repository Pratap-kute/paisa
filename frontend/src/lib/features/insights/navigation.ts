import type { Insight } from "$lib/domain/insights";

export function buildInsightActionHref(insight: Insight): string {
  const url = new URL(insight.href || "/insights", "https://paisa.local");
  if (insight.period && /^\d{4}-(0[1-9]|1[0-2])$/.test(insight.period)) {
    url.searchParams.set("period", insight.period);
  }
  if (
    insight.account &&
    ["category_spike", "budget_overspent", "budget_risk"].includes(insight.type)
  ) url.searchParams.set("account", insight.account);
  if (insight.account && insight.type === "recurring_increase") {
    url.searchParams.set("key", insight.account);
  }
  return `${url.pathname}${url.search}`;
}
