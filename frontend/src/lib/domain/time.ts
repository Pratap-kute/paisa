import dayjs from "dayjs";
export function setNow(value: dayjs.Dayjs) {
  if (value) {
    globalThis.__now = value;
  }
}

export function now(): dayjs.Dayjs {
  if (globalThis.__now) {
    return globalThis.__now;
  }
  return dayjs();
}

export function financialYear(date: dayjs.Dayjs) {
  if (USER_CONFIG.financial_year_starting_month == 1) {
    return date.year().toString();
  }

  if (date.month() < USER_CONFIG.financial_year_starting_month - 1) {
    return `${date.year() - 1} - ${(date.year() % 100).toLocaleString("en-US", {
      minimumIntegerDigits: 2,
    })}`;
  } else {
    return `${date.year()} - ${((date.year() + 1) % 100).toLocaleString(
      "en-US",
      {
        minimumIntegerDigits: 2,
      },
    )}`;
  }
}

/**
 * The financial year to show: the current one when it is still available,
 * otherwise the latest available. The shared year starts empty and its range
 * changes once a page has loaded its data, so a value outside the range would
 * show an empty year or a blank picker. `available` is ordered latest first.
 */
export function resolveFinancialYear(
  current: string,
  available: string[],
): string {
  if (available.length === 0) return current;
  return available.includes(current) ? current : available[0];
}

export function monthDays(month: string) {
  const monthStart = dayjs(month, "YYYY-MM");
  const monthEnd = monthStart.endOf("month");
  const weekStart = monthStart.startOf("week");
  const weekEnd = monthEnd.endOf("week");

  const days: dayjs.Dayjs[] = [];
  let d = weekStart;
  while (d.isSameOrBefore(weekEnd)) {
    days.push(d);
    d = d.add(1, "day");
  }
  return { days, monthStart, monthEnd };
}

export function prefixMinutesSeconds(cronExpression: string) {
  return cronExpression
    .split("|")
    .map((cron) => "0 0 " + cron)
    .join("|");
}
