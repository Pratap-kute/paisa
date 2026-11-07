import type { AssetBreakdown } from "#lib/domain/assets";

const CHECKING = "Assets:Checking";

function isSameOrParent(account: string, group: string) {
  return account === group || account.startsWith(group + ":");
}

/**
 * Cash held in a group. Checking is cash, not an investment, so the backend
 * reports its balance but no gain. Market value minus this amount is the value
 * of the investments, which is what the group's gain covers.
 */
export function cashAmount(
  group: string,
  breakdowns: Record<string, AssetBreakdown>,
): number {
  const checking = breakdowns[CHECKING];
  if (!checking) return 0;
  if (isSameOrParent(group, CHECKING))
    return breakdowns[group]?.marketAmount ?? 0;
  if (isSameOrParent(CHECKING, group)) return checking.marketAmount;
  return 0;
}

export function withCash(breakdowns: Record<string, AssetBreakdown>) {
  return Object.values(breakdowns).map((b) => ({
    ...b,
    cashAmount: cashAmount(b.group, breakdowns),
  }));
}
