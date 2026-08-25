import type dayjs from "dayjs";
import type { Posting } from "$lib/domain/ledger";
export interface Tax {
  start_date: string;
  end_date: string;
  postings: Posting[];

  gain: number;
  taxable: number;
  short_term: number;
  long_term: number;
  slab: number;
}

export interface PostingPair {
  purchase: Posting;
  sell: Posting;
  tax: Tax;
}

export interface FYCapitalGain {
  tax: Tax;
  units: number;
  purchase_price: number;
  sell_price: number;
  posting_pairs: PostingPair[];
}

export interface HarvestBreakdown {
  units: number;
  purchase_date: string;
  purchase_price: number;
  purchase_unit_price: number;
  current_price: number;
  tax: Tax;
}

export interface Harvestable {
  account: string;
  tax_category: string;
  total_units: number;
  harvestable_units: number;
  unrealized_gain: number;
  taxable_unrealized_gain: number;
  current_unit_price: number;
  current_unit_date: string;
  harvest_breakdown: HarvestBreakdown[];
}

export interface CapitalGain {
  account: string;
  tax_category: string;
  fy: { [key: string]: FYCapitalGain };
}

export interface ScheduleALSection {
  code: string;
  section: string;
  details: string;
}

export interface ScheduleALEntry {
  section: ScheduleALSection;
  amount: number;
}

export interface ScheduleAL {
  entries: ScheduleALEntry[];
  date: dayjs.Dayjs;
}
