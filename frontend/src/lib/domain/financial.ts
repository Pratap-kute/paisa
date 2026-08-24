export enum PaymentDueTime {
  End = 0,
  Begin = 1,
}

/**
 * Calculates the future value of an investment based on periodic, constant payments and a constant interest rate.
 */
export function fv(
  rate: number,
  nper: number,
  pmt: number,
  pv: number = 0,
  type: PaymentDueTime | number = PaymentDueTime.End,
): number {
  if (rate === 0) {
    return -(pv + pmt * nper);
  }
  const typeVal = type === PaymentDueTime.Begin ? 1 : 0;
  const factor = Math.pow(1 + rate, nper);
  return -(
    pv * factor +
    pmt * (1 + rate * typeVal) * ((factor - 1) / rate)
  );
}

/**
 * Calculates the payment for a loan based on constant payments and a constant interest rate.
 */
export function pmt(
  rate: number,
  nper: number,
  pv: number,
  fv: number = 0,
  type: PaymentDueTime | number = PaymentDueTime.End,
): number {
  if (nper === 0) return 0;
  if (rate === 0) {
    return -(pv + fv) / nper;
  }
  const typeVal = type === PaymentDueTime.Begin ? 1 : 0;
  const factor = Math.pow(1 + rate, nper);
  const annuity = (1 + rate * typeVal) * ((factor - 1) / rate);
  return -(fv + pv * factor) / annuity;
}

/**
 * Returns the number of periods for an investment based on periodic, constant payments and a constant interest rate.
 */
export function nper(
  rate: number,
  pmt: number,
  pv: number,
  fv: number = 0,
  type: PaymentDueTime | number = PaymentDueTime.End,
): number {
  if (rate === 0) {
    return pmt !== 0 ? -(pv + fv) / pmt : 0;
  }
  const typeVal = type === PaymentDueTime.Begin ? 1 : 0;
  const k = (pmt * (1 + rate * typeVal)) / rate;
  const num = k - fv;
  const den = pv + k;
  if (den === 0 || num / den <= 0) {
    return NaN;
  }
  return Math.log(num / den) / Math.log(1 + rate);
}
