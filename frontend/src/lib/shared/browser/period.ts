export function validPeriod(
  value: string | null | undefined,
): string | undefined {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;
}
