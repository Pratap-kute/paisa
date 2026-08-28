export function validPeriod(
  value: string | null | undefined,
): string | undefined {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;
}

export function isHistoricalPeriod(
  requestedPeriod: string | undefined,
  currentPeriod: string,
): boolean {
  return requestedPeriod !== undefined && requestedPeriod !== currentPeriod;
}

export function isInPeriod(
  value: { format(pattern: string): string },
  period: string,
): boolean {
  return value.format("YYYY-MM") === period;
}
