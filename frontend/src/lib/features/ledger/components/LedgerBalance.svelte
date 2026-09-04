<script lang="ts">
interface Props {
  output: string;
}

interface BalanceValue {
  amount: string;
  commodity: string;
  isCurrency: boolean;
}

interface ParsedEntry {
  type: "entry";
  value: BalanceValue;
  account?: string;
  depth: number;
}

interface ParsedDivider {
  type: "divider";
}

interface ParsedRaw {
  type: "raw";
  rawText: string;
}

type ParsedLine = ParsedEntry | ParsedDivider | ParsedRaw;

interface AccountGroup {
  type: "account";
  account: string;
  depth: number;
  values: BalanceValue[];
  path: string[];
  hasChildren: boolean;
}

interface SummaryGroup {
  type: "summary";
  values: BalanceValue[];
}

interface DividerGroup {
  type: "divider";
}

interface RawGroup {
  type: "raw";
  rawText: string;
}

type BalanceGroup = AccountGroup | SummaryGroup | DividerGroup | RawGroup;

const CURRENCIES = new Set([
  "INR",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
  "SGD",
  "HKD",
  "NZD",
  "$",
  "€",
  "£",
  "₹",
]);

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  $: "$",
  "€": "€",
  "£": "£",
  "₹": "₹",
};

let { output }: Props = $props();

function balanceValue(amount: string, commodity: string): BalanceValue {
  return {
    amount,
    commodity,
    isCurrency: CURRENCIES.has(commodity.toUpperCase()),
  };
}

function parseLine(line: string): ParsedLine | null {
  if (!line.trim()) return null;

  const trimmed = line.trim();
  if (trimmed.startsWith("---") || trimmed.startsWith("===")) {
    return { type: "divider" };
  }

  // Match: (amount and commodity)(2 or more spaces)(account name)
  const match = line.match(
    /^(\s*[-+]?[0-9,]+(?:\.[0-9]+)?\s+\S+)(\s{2,})(\S.*)$/,
  );
  if (match) {
    const amountPart = match[1].trim();
    const valMatch = amountPart.match(/^([-+]?[0-9,]+(?:\.[0-9]+)?)\s+(\S+)$/);
    if (valMatch) {
      const spaceCount = match[2].length;
      const depth = Math.max(0, Math.round((spaceCount - 2) / 2));
      const cleanAccount = match[3].trim();
      return {
        type: "entry",
        value: balanceValue(valMatch[1], valMatch[2]),
        account: cleanAccount,
        depth,
      };
    }
  }

  // Amount only (e.g. "                   0" summary lines)
  const singleNumberMatch = line.match(/^\s*([-+]?[0-9,]+(?:\.[0-9]+)?)\s*$/);
  if (singleNumberMatch) {
    return {
      type: "entry",
      value: balanceValue(singleNumberMatch[1], ""),
      depth: 0,
    };
  }

  // Amount with commodity only (multi-commodity continuation line or footer)
  const valOnlyMatch = line.match(
    /^\s*([-+]?[0-9,]+(?:\.[0-9]+)?)\s+(\S+)\s*$/,
  );
  if (valOnlyMatch) {
    return {
      type: "entry",
      value: balanceValue(valOnlyMatch[1], valOnlyMatch[2]),
      depth: 0,
    };
  }

  return { type: "raw", rawText: line };
}

function parseBalance(output: string): BalanceGroup[] {
  const lines = output.split("\n");
  const parsedLines = lines
    .map(parseLine)
    .filter((l): l is ParsedLine => l !== null);

  const groups: BalanceGroup[] = [];
  let pendingValues: BalanceValue[] = [];
  let dividerSeen = false;

  for (const line of parsedLines) {
    if (line.type === "divider") {
      if (pendingValues.length > 0) {
        groups.push({ type: "summary", values: pendingValues });
        pendingValues = [];
      }
      dividerSeen = true;
      groups.push({ type: "divider" });
      continue;
    }

    if (line.type === "raw") {
      if (pendingValues.length > 0) {
        groups.push({ type: "summary", values: pendingValues });
        pendingValues = [];
      }
      groups.push({ type: "raw", rawText: line.rawText });
      continue;
    }

    if (line.type === "entry") {
      pendingValues.push(line.value);
      if (line.account) {
        if (!dividerSeen) {
          groups.push({
            type: "account",
            account: line.account,
            depth: line.depth,
            values: pendingValues,
            path: [],
            hasChildren: false,
          });
        } else {
          groups.push({
            type: "summary",
            values: pendingValues,
          });
        }
        pendingValues = [];
      }
    }
  }

  if (pendingValues.length > 0) {
    groups.push({ type: "summary", values: pendingValues });
    pendingValues = [];
  }

  const path: string[] = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (group.type !== "account") continue;

    path[group.depth] = group.account;
    path.length = group.depth + 1;
    group.path = [...path];

    const nextAccount = groups
      .slice(index + 1)
      .find((candidate): candidate is AccountGroup =>
        candidate.type === "account"
      );

    group.hasChildren = !!nextAccount && nextAccount.depth > group.depth;
  }

  return groups;
}

function primaryCurrency(groups: BalanceGroup[]): string | null {
  const counts = new Map<string, number>();

  for (const group of groups) {
    if (group.type !== "account" && group.type !== "summary") continue;
    for (const value of group.values) {
      if (!value.isCurrency) continue;
      counts.set(value.commodity, (counts.get(value.commodity) || 0) + 1);
    }
  }

  let currency: string | null = null;
  let count = 0;

  for (const [candidate, candidateCount] of counts) {
    if (candidateCount > count) {
      currency = candidate;
      count = candidateCount;
    }
  }

  return currency;
}

function numericValue(value: BalanceValue): number | null {
  const numeric = Number(value.amount.replaceAll(",", ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value: BalanceValue): string {
  const numeric = numericValue(value);
  if (numeric === null) return value.amount;

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: value.isCurrency ? 2 : 4,
  }).format(numeric);
}

function formatCurrency(value: BalanceValue): string {
  const numeric = numericValue(value);
  if (numeric === null) return `${value.commodity} ${value.amount}`;

  const upper = value.commodity.toUpperCase();
  const marker = CURRENCY_SYMBOLS[upper] || value.commodity;
  const sign = numeric < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(numeric));

  return `${sign}${marker}${formatted}`;
}

function displayValue(value: BalanceValue): string {
  return value.isCurrency ? formatCurrency(value) : formatNumber(value);
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/[:\s./-]+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}

function commodityMatchesAccount(
  group: AccountGroup,
  commodity: string,
): boolean {
  const commodityKey = normalizeKey(commodity);
  const accountKey = normalizeKey(group.account);

  if (accountKey === commodityKey) return true;

  const pathKey = normalizeKey(group.path.join(":"));
  return pathKey === commodityKey || pathKey.endsWith(`_${commodityKey}`);
}

function showUnit(group: AccountGroup, value: BalanceValue): boolean {
  return (
    !value.isCurrency && !commodityMatchesAccount(group, value.commodity)
  );
}

function rootTotal(
  group: AccountGroup,
  baseCurrency: string | null,
): BalanceValue | null {
  if (
    group.depth === 0 &&
    group.hasChildren &&
    group.values.length >= 1
  ) {
    const currencyVal = group.values.find(
      (v) => v.isCurrency && (!baseCurrency || v.commodity === baseCurrency),
    );
    if (currencyVal) return currencyVal;
  }

  return null;
}

function findNetBalance(
  groups: BalanceGroup[],
  baseCurrency: string | null,
): BalanceValue | null {
  if (!baseCurrency) return null;

  let dividerSeen = false;

  for (const group of groups) {
    if (group.type === "divider") {
      dividerSeen = true;
      continue;
    }

    if (!dividerSeen || group.type !== "summary") continue;

    const baseCurrencyValue = group.values.find(
      (value) => value.isCurrency && value.commodity === baseCurrency,
    );

    if (baseCurrencyValue) return baseCurrencyValue;
  }

  return null;
}

function baseCurrencyMarker(currency: string | null): string {
  if (!currency) return "";
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

let groups = $derived(parseBalance(output));
let baseCurrency = $derived(primaryCurrency(groups));
let netBalance = $derived(findNetBalance(groups, baseCurrency));
</script>

<div class="paisa-ledger-balance">
  <div class="paisa-ledger-balance-context">
    <span class="inline-flex items-center text-xs" aria-hidden="true">
      <i class="fa-solid fa-circle-info"></i>
    </span>
    <span>
      {#if baseCurrency}
        <strong>{baseCurrencyMarker(baseCurrency)}</strong> = {baseCurrency}.
        Unprefixed holding balances are raw units.
      {:else}
        Non-cash holding balances are raw units.
      {/if}
    </span>
  </div>

  <div class="paisa-ledger-balance-scroll">
    <div class="paisa-ledger-balance-list">
      {#each groups as group}
        {#if group.type === "account"}
          {@const aggregate = rootTotal(group, baseCurrency)}

          {#if group.hasChildren}
            <div
              class="paisa-ledger-balance-heading"
              class:is-root={group.depth === 0}
              class:is-intermediate={group.depth > 0}
              style="--paisa-ledger-depth: {group.depth}"
            >
              <span
                class="paisa-ledger-balance-heading-label"
                title={group.account}
              >
                {group.account}
              </span>

              {#if aggregate}
                <span class="paisa-ledger-balance-heading-total">
                  {displayValue(aggregate)}
                </span>
              {/if}
            </div>
          {:else}
            <div
              class="paisa-ledger-balance-row"
              style="--paisa-ledger-depth: {group.depth}"
            >
              <span class="paisa-ledger-balance-account" title={group.account}>
                {group.account}
              </span>

              <div class="paisa-ledger-balance-values">
                {#each group.values as value}
                  <div class="paisa-ledger-balance-value">
                    <span class="paisa-ledger-balance-amount">
                      {displayValue(value)}
                    </span>

                    {#if showUnit(group, value)}
                      <span class="paisa-ledger-balance-unit"
                        >{value.commodity}</span
                      >
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else if group.type === "raw"}
          <div class="paisa-ledger-balance-raw">{group.rawText}</div>
        {/if}
      {/each}

      {#if netBalance}
        <div class="paisa-ledger-balance-net">
          <span class="paisa-ledger-balance-net-label">Net balance</span>
          <span class="paisa-ledger-balance-net-value"
            >{displayValue(netBalance)}</span
          >
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
.paisa-ledger-balance {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background-color: var(--paisa-surface);
}

.paisa-ledger-balance-context {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  gap: var(--paisa-space-2);
  padding: 0.4rem var(--paisa-space-3);
  border-bottom: 1px solid var(--paisa-border-subtle);
  background-color: var(--paisa-surface-hover);
  color: var(--paisa-muted-foreground);
  font-size: 0.675rem;
  line-height: 1.35;

  > span:first-child {
    margin-top: 1px;
    color: var(--paisa-primary);
    flex-shrink: 0;
  }
}

.paisa-ledger-balance-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
}

.paisa-ledger-balance-list {
  padding: var(--paisa-space-2) 0 var(--paisa-space-4);
}

.paisa-ledger-balance-heading,
.paisa-ledger-balance-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(112px, auto);
  gap: var(--paisa-space-3);
  align-items: start;
  padding-right: var(--paisa-space-3);
}

.paisa-ledger-balance-heading {
  padding-left: calc(
    var(--paisa-space-3) + max(0, var(--paisa-ledger-depth, 0) - 1) * 0.7rem
  );
}

.paisa-ledger-balance-heading.is-root {
  margin-top: var(--paisa-space-3);
  padding: 0.45rem var(--paisa-space-3);
  border-top: 1px solid var(--paisa-border);
  border-bottom: 1px solid var(--paisa-border-subtle);
  background-color: var(--paisa-surface-raised);

  &:first-child {
    margin-top: 0;
  }

  .paisa-ledger-balance-heading-label {
    color: var(--paisa-foreground);
    font-size: 0.7rem;
    font-weight: var(--paisa-font-weight-bold);
    letter-spacing: 0.055em;
    text-transform: uppercase;
  }
}

.paisa-ledger-balance-heading.is-intermediate {
  margin-top: 0.45rem;
  padding-top: 0.28rem;
  padding-bottom: 0.2rem;

  .paisa-ledger-balance-heading-label {
    color: var(--paisa-foreground);
    font-weight: var(--paisa-font-weight-semibold);
  }
}

.paisa-ledger-balance-heading-label {
  min-width: 0;
  overflow: hidden;
  color: var(--paisa-muted-foreground);
  font-size: var(--paisa-font-size-xs);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paisa-ledger-balance-heading-total {
  color: var(--paisa-foreground);
  font-family: var(--paisa-font-mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: var(--paisa-font-weight-semibold);
  line-height: 1.35;
  text-align: right;
  white-space: nowrap;
}

.paisa-ledger-balance-row {
  padding-top: 0.18rem;
  padding-bottom: 0.18rem;
  padding-left: calc(
    var(--paisa-space-3) + max(0, var(--paisa-ledger-depth, 0)) * 0.7rem
  );
  transition: background-color var(--paisa-transition-fast);

  &:hover {
    background-color: var(--paisa-surface-hover);
  }
}

.paisa-ledger-balance-account {
  min-width: 0;
  overflow: hidden;
  color: var(--paisa-muted-foreground);
  font-size: var(--paisa-font-size-xs);
  font-weight: var(--paisa-font-weight-medium);
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paisa-ledger-balance-values {
  display: grid;
  justify-items: end;
  gap: 1px;
}

.paisa-ledger-balance-value {
  display: inline-flex;
  max-width: 100%;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--paisa-space-2);
  min-height: 1.15rem;
}

.paisa-ledger-balance-amount {
  color: var(--paisa-foreground);
  font-family: var(--paisa-font-mono);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: var(--paisa-font-weight-medium);
  line-height: 1.35;
  text-align: right;
  white-space: nowrap;
}

.paisa-ledger-balance-unit {
  color: var(--paisa-muted-foreground);
  font-family: var(--paisa-font-mono);
  font-size: 0.625rem;
  font-weight: var(--paisa-font-weight-semibold);
  line-height: 1.35;
  white-space: nowrap;
}

.paisa-ledger-balance-net {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(112px, auto);
  gap: var(--paisa-space-3);
  align-items: baseline;
  margin-top: var(--paisa-space-4);
  padding: var(--paisa-space-3);
  border-top: 1px solid var(--paisa-border);
  background-color: var(--paisa-surface-raised);
}

.paisa-ledger-balance-net-label {
  color: var(--paisa-muted-foreground);
  font-size: 0.675rem;
  font-weight: var(--paisa-font-weight-bold);
  letter-spacing: 0.055em;
  text-transform: uppercase;
}

.paisa-ledger-balance-net-value {
  color: var(--paisa-foreground);
  font-family: var(--paisa-font-mono);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  font-weight: var(--paisa-font-weight-bold);
  text-align: right;
  white-space: nowrap;
}

.paisa-ledger-balance-raw {
  padding: 1px var(--paisa-space-3);
  color: var(--paisa-muted-foreground);
  font-family: var(--paisa-font-mono);
  font-size: 0.7rem;
  white-space: pre-wrap;
}

@media screen and (max-width: 420px) {
  .paisa-ledger-balance-heading,
  .paisa-ledger-balance-row,
  .paisa-ledger-balance-net {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--paisa-space-2);
  }

  .paisa-ledger-balance-row {
    padding-left: calc(
      var(--paisa-space-3) + max(0, var(--paisa-ledger-depth, 0)) * 0.5rem
    );
  }
}
</style>
