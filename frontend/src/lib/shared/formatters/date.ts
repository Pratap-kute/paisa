import dayjs from "dayjs";

export type DayjsExtent = [
  start: dayjs.Dayjs | undefined,
  end: dayjs.Dayjs | undefined,
];

export function dayjsExtent(dates: readonly dayjs.Dayjs[]): DayjsExtent {
  if (dates.length === 0) return [undefined, undefined];

  let start = dates[0];
  let end = dates[0];
  for (let index = 1; index < dates.length; index++) {
    const date = dates[index];
    if (date.isBefore(start)) start = date;
    if (date.isAfter(end)) end = date;
  }
  return [start, end];
}

export function beginningOfFinancialYear(date: dayjs.Dayjs): dayjs.Dayjs {
  date = date.startOf("month");
  if (date.month() + 1 < USER_CONFIG.financial_year_starting_month) {
    return date
      .add(-1, "year")
      .add(
        USER_CONFIG.financial_year_starting_month - date.month() - 1,
        "month",
      );
  } else {
    return date.add(
      -(date.month() + 1 - USER_CONFIG.financial_year_starting_month),
      "month",
    );
  }
}

export function forEachMonth(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  cb: (current: dayjs.Dayjs) => void,
): void {
  let current = start.startOf("month");
  while (current.isSameOrBefore(end, "month")) {
    cb(current);
    current = current.add(1, "month");
  }
}

export function forEachYear(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  cb: (current: dayjs.Dayjs) => void,
): void {
  let current = start;
  while (current.isSameOrBefore(end, "year")) {
    cb(current);
    current = current.add(1, "year");
  }
}

export function forEachFinancialYear(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  cb?: (current: dayjs.Dayjs) => void,
): dayjs.Dayjs[] {
  let current = beginningOfFinancialYear(start);
  const years: dayjs.Dayjs[] = [];
  while (current.isSameOrBefore(end, "month")) {
    if (cb) {
      cb(current);
    }
    years.push(current);
    current = current.add(1, "year");
  }
  return years;
}
