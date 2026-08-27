import type { PredictionInput } from "./types";
import type { AmountDirection } from "./types";
import { collapseWrappedText } from "./normalize";

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
  return collapseWrappedText(parts.join(" "));
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

function isDateLike(text: string): boolean {
  const value = text.trim();
  if (/^\d{1,4}[-/.\s]\d{1,2}[-/.\s]\d{1,4}$/.test(value)) return true;
  if (/^\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{2,4}$/.test(value)) return true;
  return false;
}

function isMostlyNumeric(text: string): boolean {
  if (parseAmount(text) == null) return false;
  const letters = (text.match(/[a-zA-Z]/g) || []).length;
  return letters < 3;
}

function isTextEvidence(text: string): boolean {
  if (!text || isDateLike(text) || isMostlyNumeric(text)) return false;
  return /[a-zA-Z]/.test(text);
}

function rowDescriptionEvidence(row: Record<string, unknown>): string {
  const candidates: string[] = [];
  const fallback: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (key === "index") continue;
    if (value == null) continue;
    const text = collapseWrappedText(String(value));
    if (!text) continue;
    fallback.push(text);
    if (isTextEvidence(text)) candidates.push(text);
  }
  if (candidates.length === 0) return fallback.join(" ");
  const longest = Math.max(...candidates.map((text) => text.length));
  const minLength = Math.min(longest, Math.max(12, longest * 0.5));
  return candidates.filter((text) => text.length >= minLength).join(" ");
}

export function adaptPredictAccountArgs(
  args: unknown[],
  options: HelperOptions,
): PredictionInput {
  const hash = options.hash || {};
  const row = (options.data?.root?.ROW || {}) as Record<string, unknown>;
  const explicit = flattenTerms(args).trim();
  const description = collapseWrappedText(
    explicit || rowDescriptionEvidence(row),
  );

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
