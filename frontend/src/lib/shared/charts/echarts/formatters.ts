import {
  formatCurrency,
  formatCurrencyCrude,
  formatFloat,
  formatPercentage,
} from "$lib/core/utils";

export const chartFormatters = {
  currency: formatCurrency,
  compactCurrency: formatCurrencyCrude,
  number: formatFloat,
  percentage: formatPercentage,
};
