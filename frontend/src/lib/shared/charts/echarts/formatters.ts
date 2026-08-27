import {
  formatCurrency,
  formatCurrencyCrude,
  formatFloat,
  formatPercentage,
} from "$lib/shared/formatters/currency";

export const chartFormatters = {
  currency: formatCurrency,
  compactCurrency: formatCurrencyCrude,
  number: formatFloat,
  percentage: formatPercentage,
};
