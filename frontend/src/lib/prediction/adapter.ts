import type { PredictionInput } from "./types";
import type { AmountDirection } from "./types";

interface HelperOptions {
  hash?: Record<string, unknown>;
  data?: { root?: { ROW?: Record<string, unknown> } };
}

function flattenTerms(args: unknown[]): string {
  const parts: string[] = [];
  for (const arg of args) {
    if (arg == null) continue;
    if (typeof arg === "object") {
      parts.push(
        ...Object.values(arg as Record<string, unknown>).map((value) =>
          value == null ? "" : String(value)
        ),
      );
    } else {
      parts.push(String(arg));
    }
  }
  return parts.join(" ");
}

function parseAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const amount = value.trim().replace(/\((.+)\)/, "-$1").replace(
    /[^0-9.-]/g,
    "",
  );
  if (amount === "" || Number.isNaN(Number(amount))) return undefined;
  return parseFloat(amount);
}

function parseDirection(value: unknown): AmountDirection | undefined {
  if (value === "DEBIT" || value === "CREDIT") return value;
  return undefined;
}

function rowText(row: Record<string, unknown>): string {
  return Object.values(row).map((value) => value == null ? "" : String(value))
    .join(" ");
}

export function adaptPredictAccountArgs(
  args: unknown[],
  options: HelperOptions,
): PredictionInput {
  const hash = options.hash || {};
  const row = (options.data?.root?.ROW || {}) as Record<string, unknown>;
  const explicit = flattenTerms(args).trim();
  const description = explicit
    ? (rowText(row) ? `${explicit} ${rowText(row)}` : explicit)
    : rowText(row);

  const prefix = typeof hash.prefix === "string" ? hash.prefix : "";
  const sourceAccount = typeof hash.source === "string"
    ? hash.source
    : undefined;
  const commodity = typeof hash.commodity === "string"
    ? hash.commodity
    : undefined;
  const date = typeof hash.date === "string" ? hash.date : undefined;
  const amount = parseAmount(hash.amount);
  let direction = parseDirection(hash.direction);
  if (!direction && sourceAccount && amount != null && amount !== 0) {
    direction = amount < 0 ? "DEBIT" : "CREDIT";
  }

  const rowIndex = typeof row.index === "number" ? row.index : undefined;

  return {
    description,
    amount,
    date,
    commodity,
    sourceAccount,
    direction,
    prefix,
    rowIndex,
  };
}
