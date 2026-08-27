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
    Object.is(value, -0) || Math.abs(value) < 1e-9 || !Number.isFinite(value)
  ) {
    return 0;
  }
  return value;
}

export function formatCurrency(
  value: number,
  precision: number = null,
): string {
  value = normalize(value);

  if (precision == null) {
    precision = USER_CONFIG.display_precision;
  }

  return unicodeMinus(
    value.toLocaleString(USER_CONFIG.locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
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
