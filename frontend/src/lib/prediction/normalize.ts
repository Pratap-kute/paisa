import { GENERIC_MERCHANT_KEYS } from "./weights";
import type { NormalizedDescription } from "./types";

const NOISE_TOKENS = new Set([
  "upi",
  "imps",
  "neft",
  "rtgs",
  "pos",
  "atm",
  "ref",
  "reference",
  "txn",
  "transaction",
  "payment",
  "paid",
  "via",
  "www",
  "http",
  "https",
  "com",
  "in",
  "the",
  "to",
  "from",
  "for",
  "and",
  "by",
  "at",
  "on",
  "of",
  "a",
  "an",
  "gpay",
  "paytm",
  "phonepe",
  "bharatpe",
  "null",
  "na",
]);

const ALIASES: Record<string, string> = {
  amzn: "amazon",
  "amazon in": "amazon",
  "amazon com": "amazon",
  "amazon pay": "amazon",
  amazonpay: "amazon",
  "7eleven": "7 eleven",
  "7-eleven": "7 eleven",
  hdfclife: "hdfc life",
};

export function tokenize(text: string): string[] {
  const tokens = expandDigitWords(
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
  )
    .split(/\s+/)
    .filter((token) => token.length > 0);
  return tokens.flatMap((token) => {
    const alias = ALIASES[token];
    return alias ? alias.split(" ") : [token];
  });
}

function expandDigitWords(text: string): string {
  return text
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2");
}

export function aliasKey(tokens: string[]): string {
  const joined = tokens.join(" ");
  if (ALIASES[joined]) {
    return ALIASES[joined];
  }
  const compact = tokens.join("");
  if (ALIASES[compact]) {
    return ALIASES[compact];
  }
  const aliased = tokens.map((token) => ALIASES[token] || token);
  return aliased.join(" ").trim();
}

export function stripNoise(tokens: string[]): string[] {
  return tokens.filter((token) => {
    if (NOISE_TOKENS.has(token)) return false;
    if (/^\d+$/.test(token) && token.length >= 3) return false;
    return true;
  });
}

export function isGenericMerchant(merchantKey: string): boolean {
  return GENERIC_MERCHANT_KEYS.has(merchantKey);
}

export function normalizeDescription(raw: string): NormalizedDescription {
  const value = (raw ?? "").toString();
  const allTokens = tokenize(value);
  const full = allTokens.join(" ");
  const merchantTokens = stripNoise(allTokens);
  const noiseStripped = merchantTokens.join(" ");
  const merchantKey = aliasKey(merchantTokens);
  return {
    raw: value,
    full,
    noiseStripped,
    tokens: merchantTokens,
    merchantKey,
  };
}
