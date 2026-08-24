import COLORS from "$lib/core/colors";
import type { Legend } from "$lib/core/utils";

const areaKeys = ["gain", "loss"] as const;
const lineKeys = ["balance", "investment", "withdrawal"] as const;

const colors: Record<
  (typeof areaKeys)[number] | (typeof lineKeys)[number],
  string
> = {
  balance: COLORS.primary,
  investment: COLORS.secondary,
  withdrawal: COLORS.tertiary,
  gain: COLORS.gain,
  loss: COLORS.loss,
};

export function buildLegends(): Legend[] {
  return [...lineKeys, ...areaKeys].map((key) => ({
    label: key,
    color: colors[key],
    shape: "square" as const,
  }));
}
