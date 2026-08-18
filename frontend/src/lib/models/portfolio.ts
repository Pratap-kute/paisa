import type dayjs from "dayjs";

export interface CommodityBreakdown {
  commodity: string;
  amount: number;
}

export interface PortfolioAggregate {
  key: string;
  name: string;
  commodities: CommodityBreakdown[];
  amount: number;
}

export interface ScheduleALEntry {
  code: string;
  section: string;
  details: string;
  amount: number;
}

export interface ScheduleAL {
  date: dayjs.Dayjs;
  entries: ScheduleALEntry[];
}
