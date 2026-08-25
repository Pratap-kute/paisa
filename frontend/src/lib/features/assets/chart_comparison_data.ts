import { restName } from "$lib/domain/account";
import type { Gain } from "$lib/domain/assets";
import COLORS from "$lib/shared/theme/colors";
import type { AllocationTarget } from "$lib/domain/assets";
import type { ComparisonBarChartData } from "$lib/shared/charts/echarts/bar_comparison";
import { sortBy } from "$lib/shared/utils/collection";

export function buildAllocationTargetComparison(
  allocationTargets: AllocationTarget[],
): ComparisonBarChartData {
  return {
    valueFormat: "number",
    valueLabel: "Current",
    targetLabel: "Target",
    sort: "input",
    points: sortBy(allocationTargets, (target) => target.name).map((
      target,
    ) => ({
      key: target.name,
      label: target.name,
      value: target.current,
      target: target.target,
      secondaryValue: target.current - target.target,
      secondaryLabel: "Diff",
      color: COLORS.secondary,
      tooltipRows: [
        { label: "Target", value: target.target, format: "number" },
        { label: "Current", value: target.current, format: "number" },
        {
          label: "Diff",
          value: target.current - target.target,
          format: "number",
        },
      ],
    })),
  };
}

export function buildGainOverviewComparison(
  gains: Gain[],
): ComparisonBarChartData {
  return {
    valueFormat: "currency",
    valueLabel: "Balance",
    sort: "input",
    points: sortBy(gains, (gain) => gain.account).map((gain) => {
      const current = gain.networth;
      return {
        key: gain.account,
        label: restName(gain.account),
        value: current.balanceAmount,
        secondaryValue: gain.xirr,
        secondaryLabel: "XIRR",
        color: current.gainAmount >= 0 ? COLORS.gain : COLORS.loss,
        tooltipRows: [
          {
            label: "Investment",
            value: current.investmentAmount,
            format: "currency",
          },
          {
            label: "Withdrawal",
            value: current.withdrawalAmount,
            format: "currency",
          },
          { label: "Gain", value: current.gainAmount, format: "currency" },
          {
            label: "Balance",
            value: current.balanceAmount,
            format: "currency",
          },
          { label: "XIRR", value: gain.xirr, format: "number" },
        ],
      };
    }),
  };
}
