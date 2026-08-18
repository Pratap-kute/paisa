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
  "paym",
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
  "wdl",
  "tfr",
  "dep",
  "dr",
  "cr",
  "withdrawal",
  "transfer",
  "cheque",
  "chq",
]);

const GENERIC_MERCHANT_SUFFIXES = new Set([
  "seller",
  "store",
  "stores",
  "services",
  "service",
  "pvt",
  "ltd",
  "limited",
  "india",
  "retail",
  "pay",
  "payments",
  "private",
  "inc",
  "llc",
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

export function collapseWrappedText(text: string): string {
  return text
    .replace(/([A-Za-z0-9])\r?\n([A-Za-z0-9])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const aliasedJoined = aliased.join(" ");
  if (ALIASES[aliasedJoined]) {
    return ALIASES[aliasedJoined];
  }
  const withoutSuffix = aliased.filter((token, index) =>
    index === 0 || !GENERIC_MERCHANT_SUFFIXES.has(token)
  );
  const key = withoutSuffix.join(" ").trim();
  return ALIASES[key] || key;
}

export function stripNoise(tokens: string[]): string[] {
  return tokens.filter((token) => {
    if (NOISE_TOKENS.has(token)) return false;
    if (/^[a-z]$/.test(token)) return false;
    if (/^\d+$/.test(token) && token.length >= 3) return false;
    return true;
  });
}

export function extractUpiMerchant(raw: string): string | undefined {
  const match = raw.match(/upi\/(?:(?:dr|cr)\/)?(\d+)\/([^/\n]+)/i);
  if (!match) return undefined;
  const merchant = match[2].trim();
  return merchant || undefined;
}

export function extractNeftMerchant(raw: string): string | undefined {
  if (!/neft/i.test(raw)) return undefined;
  const parts = collapseWrappedText(raw).split("*").map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const compact = part.replace(/\s/g, "");
    if (/neft/i.test(part)) continue;
    if (/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(compact)) continue;
    if (/^[A-Z]{4}[A-Z0-9]{10,}$/i.test(compact)) continue;
    if (/^\d+$/.test(compact)) continue;
    const letters = (part.match(/[a-zA-Z]/g) || []).length;
    if (letters < 3) continue;
    return part;
  }
  return undefined;
}

export function isGenericMerchant(merchantKey: string): boolean {
  return GENERIC_MERCHANT_KEYS.has(merchantKey);
}

export function normalizeDescription(raw: string): NormalizedDescription {
  const value = collapseWrappedText((raw ?? "").toString());
  const allTokens = tokenize(value);
  const full = allTokens.join(" ");
  const merchantTokens = stripNoise(allTokens);
  const noiseStripped = merchantTokens.join(" ");
  const namedMerchant = extractUpiMerchant(value) || extractNeftMerchant(value);
  const namedKey = namedMerchant
    ? aliasKey(stripNoise(tokenize(namedMerchant)))
    : "";
  const merchantKey = namedKey || aliasKey(merchantTokens);
  return {
    raw: value,
    full,
    noiseStripped,
    tokens: merchantTokens,
    merchantKey,
  };
}
