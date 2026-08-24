import dayjs from "dayjs";
import type { AccountTfIdf } from "$lib/core/utils";
import { dayjsExtent } from "$lib/shared/formatters/date";

interface GlobalWithNow {
  __now?: dayjs.Dayjs;
}

export function now(): dayjs.Dayjs {
  const customNow = (globalThis as GlobalWithNow).__now;
  if (customNow) {
    return customNow;
  }
  return dayjs();
}

class AppState {
  month = $state(now().format("YYYY-MM"));
  year = $state<string>("");
  dateRangeOption = $state<number>(3);
  dateMin = $state<dayjs.Dayjs>(dayjs("1980", "YYYY"));
  dateMax = $state<dayjs.Dayjs>(now());
  theme = $state<string>("light");
  loading = $state<boolean>(false);
  accountTfIdf = $state<AccountTfIdf | null>(null);
  willClearTippy = $state<number>(0);
  willRefresh = $state<number>(0);

  dateRange = $derived.by(() => {
    if (this.dateRangeOption === -1) {
      return { from: this.dateMin, to: this.dateMax };
    }
    return {
      from: this.dateMax.subtract(this.dateRangeOption, "year"),
      to: this.dateMax,
    };
  });

  setAllowedDateRange(dates: dayjs.Dayjs[]) {
    const [start, end] = dayjsExtent(dates);
    if (start && end) {
      this.dateMin = start;
      this.dateMax = end;
    }
  }

  triggerRefresh() {
    this.willRefresh++;
  }
}

export const appState = new AppState();
