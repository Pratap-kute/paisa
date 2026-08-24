import type { Arima } from "arima/async";
import dayjs from "dayjs";
import * as financial from "./financial";
import type { Forecast, Point } from "$lib/core/utils";
import { now } from "$lib/core/utils";

const WHEN = financial.PaymentDueTime.Begin;

export function solvePMTOrNper(
  fv: number,
  rate: number,
  pv: number,
  pmt: number,
  targetDate: string,
) {
  const empty = { pmt: 0, targetDate: "" };

  rate = rate / (100 * 12);
  const today = now().startOf("month");

  let targetDateObject = dayjs(targetDate, "YYYY-MM-DD", true);
  if (targetDateObject.isValid()) {
    const nper = targetDateObject.diff(today, "months");
    if (nper <= 0) {
      return empty;
    }
    pmt = financial.pmt(rate, nper, pv, -fv, WHEN);
    if (pmt <= 0) {
      // target will be achieved without any monthly savings
      return { pmt: 0.001, targetDate };
    }
  } else if (pmt > 0) {
    const nper = financial.nper(rate, pmt, pv, -fv, WHEN);
    targetDateObject = today.add(Math.ceil(nper), "months");
    targetDate = targetDateObject.format("YYYY-MM-DD");
  }

  return { pmt, targetDate };
}

export function project(
  fv: number,
  rate: number,
  targetDate: dayjs.Dayjs,
  pmt: number,
  pv: number,
): Forecast[] {
  rate = rate / (100 * 12);
  const today = now().startOf("month");

  if (fv <= pv) {
    return [];
  }

  if (targetDate.isSameOrBefore(today, "day")) {
    return [];
  }

  const nper = targetDate.diff(today, "months");
  if (nper <= 0) {
    return [];
  }

  const points: Forecast[] = [];
  let current = today.add(1, "month");
  while (current.isSameOrBefore(targetDate, "day")) {
    const value = financial.fv(
      rate,
      current.diff(today, "months"),
      -pmt,
      -pv,
      WHEN,
    );
    points.push({ date: current, value, error: 0 });
    current = current.add(1, "month");
  }

  return points;
}

export function forecast(
  points: Point[],
  target: number,
  ARIMA: typeof Arima,
): Forecast[] {
  const configs = [
    { p: 3, d: 0, q: 1, s: 0, verbose: false },
    { p: 2, d: 0, q: 1, s: 0, verbose: false },
  ];

  for (const config of configs) {
    const forecast = doForecast(config, points, target, ARIMA);
    if (forecast.length > 0) {
      return forecast;
    }
  }
  return [];
}

function doForecast(
  config: object,
  points: Point[],
  target: number,
  ARIMA: typeof Arima,
): Forecast[] {
  const values = points.map((p) => p.value);
  const arima = new ARIMA(config).train(values);

  const predictYears = 3;
  let i = 1;
  while (i < 10) {
    const [predictions, errors] = arima.predict(predictYears * i * 365);
    if (!predictions || predictions.length === 0) {
      return [];
    }
    if ((predictions.at(-1) ?? 0) > target) {
      const predictionsTimeline: Forecast[] = [];
      let start = points.at(-1)?.date ?? now();
      while (predictions.length > 0) {
        start = start.add(1, "day");
        const point = {
          date: start,
          value: predictions.shift(),
          error: Math.sqrt(errors.shift()),
        };
        if (
          point.value > 1e20 ||
          point.value < -1e20 ||
          point.error > 1e20 ||
          point.value < -1e20
        ) {
          return [];
        }
        predictionsTimeline.push(point);
      }
      return predictionsTimeline;
    }
    i++;
  }
  return [];
}

export function findBreakPoints(points: Point[], target: number): Point[] {
  const result: Point[] = [];
  let i = 1;
  while (i <= 4 && points.length > 0) {
    const p = points.shift();
    if (!p) {
      continue;
    }
    if (p.value >= target * (i / 4)) {
      result.push(p);
      i++;
    }
  }

  return result;
}
