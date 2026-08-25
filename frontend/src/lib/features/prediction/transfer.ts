import { MATCH } from "./weights";
import { normalizeDescription } from "./normalize";
import { accountMatchesPrefix } from "./score";
import type { CurrentImportContext, PredictionInput } from "./types";

const TRANSFER_KEYWORDS = [
  "imps",
  "neft",
  "rtgs",
  "transfer",
  "self",
  "own account",
  "to transfer",
  "by transfer",
  "fund transfer",
];

function hasTransferLanguage(description: string): boolean {
  const text = description.toLowerCase();
  return TRANSFER_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isAssetLike(account: string): boolean {
  return accountMatchesPrefix(account, "Assets") ||
    accountMatchesPrefix(account, "Liabilities");
}

export function detectTransfer(
  input: PredictionInput,
  currentImport: CurrentImportContext = { rows: [] },
): boolean {
  const keyword = hasTransferLanguage(input.description) &&
    isGenericEnough(input.description);

  if (
    input.amount == null || !Number.isFinite(input.amount) || input.amount === 0
  ) {
    return keyword;
  }

  const absAmount = Math.abs(input.amount);
  const inputMs = input.date ? Date.parse(input.date) : NaN;
  const counterparts = new Set<string>();

  for (const row of currentImport.rows) {
    if (row.rowIndex != null && row.rowIndex === input.rowIndex) continue;
    if (
      input.commodity && row.commodity &&
      row.commodity !== input.commodity
    ) {
      continue;
    }
    if (
      row.amount == null || !Number.isFinite(row.amount) || row.amount === 0
    ) {
      continue;
    }
    const postingAbs = Math.abs(row.amount);
    const rel = Math.abs(postingAbs - absAmount) /
      Math.max(postingAbs, absAmount);
    if (rel > MATCH.TRANSFER_AMOUNT_TOLERANCE) continue;
    if (!Number.isNaN(inputMs) && row.date) {
      const postingMs = Date.parse(row.date);
      if (!Number.isNaN(postingMs)) {
        const days = Math.abs(inputMs - postingMs) / 86400000;
        if (days > MATCH.TRANSFER_DATE_WINDOW_DAYS) continue;
      }
    }
    const counterpart = row.sourceAccount || row.prefix || "";
    if (!isAssetLike(counterpart) && !isAssetLike(row.prefix || "")) continue;
    counterparts.add(counterpart || row.prefix);
  }

  if (counterparts.size > 2) return false;
  if (counterparts.size === 1 && hasTransferLanguage(input.description)) {
    return true;
  }
  if (counterparts.size === 1 && isAssetLike(input.prefix || "")) {
    return true;
  }
  return keyword && counterparts.size === 1;
}

function isGenericEnough(description: string): boolean {
  const normalized = normalizeDescription(description);
  return normalized.merchantKey.length === 0 ||
    hasTransferLanguage(description);
}
