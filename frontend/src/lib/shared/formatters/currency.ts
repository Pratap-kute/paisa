import { obscure } from "$lib/shared/state/persisted";
import { get } from "svelte/store";

export function unicodeMinus(s: string): string {
  if (typeof s !== "string") {
    return s;
  }
  return s.replace(/^-/, "\u2212");
}

export function normalize(value: number): number {
  if (get(obscure)) {
    return 0;
  }
  if (
    Object.is(value, -0) ||
    Math.abs(value) < 1e-9 ||
    !Number.isFinite(value)
  ) {
    return 0;
  }
  return value;
}

export function formatCurrency(value: number, precision?: number): string {
  value = normalize(value);
  const resolvedPrecision = precision ?? USER_CONFIG.display_precision;

  return unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      minimumFractionDigits: resolvedPrecision,
      maximumFractionDigits: resolvedPrecision,
    }),
  );
}

export function formatCurrencyCrude(value: number): string {
  return formatCurrencyCrudeWithPrecision(value, -1);
}

export function formatCurrencyCrudeWithPrecision(
  value: number,
  precision: number,
): string {
  value = normalize(value);

  const options: Intl.NumberFormatOptions = {
    notation: "compact",
  };

  if (precision < 0) {
    options.maximumFractionDigits = 2;
  } else {
    options.maximumFractionDigits = precision;
    options.minimumFractionDigits = precision;
  }

  return unicodeMinus(value.toLocaleString(USER_CONFIG.locale, options));
}

export function formatFloat(value: number, precision = 2): string {
  value = normalize(value);

  return unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }),
  );
}

export function formatFloatUptoPrecision(value: number, precision = 2): string {
  value = normalize(value);

  return unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      maximumFractionDigits: precision,
    }),
  );
}

export function formatPercentage(value: number, precision = 0): string {
  value = normalize(value);

  return unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      style: "percent",
      minimumFractionDigits: precision,
    }),
  );
}

/**
 * Formats a return the backend reports in percent, such as XIRR or an
 * annualized return (6 means 6%). Use formatPercentage for ratios (0.06).
 */
export function formatReturnPercent(
  value: number | null | undefined,
  precision = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${formatFloat(value, precision)}%`;
}

/** Shares, progress and utilisation of a total: one decimal, for a ratio (0.656). */
export function formatShare(ratio: number): string {
  return formatPercentage(ratio, 1);
}

export function formatFixedWidthFloat(
  value: number,
  width: number,
  precision = 2,
): string {
  value = normalize(value);

  const formatted = unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }),
  );

  if (formatted.length < width) {
    return formatted.padStart(width, " ");
  }
  return formatted;
}

/**
 * Commodity labels retain the same locale, precision and privacy policy as money
 * elsewhere. The default currency is implied and never written out.
 */
export function formatCommodityAmount(
  value: number | undefined,
  commodity?: string,
  masked = get(obscure),
): string {
  if (value === undefined) return "Amount unavailable";
  const label =
    commodity && commodity !== USER_CONFIG.default_currency
      ? ` ${commodity}`
      : "";
  return `${formatCurrency(masked ? 0 : value)}${label}`;
}
