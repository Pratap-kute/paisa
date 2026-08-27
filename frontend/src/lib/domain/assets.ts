import type dayjs from "dayjs";
import type { Posting } from "$lib/domain/ledger";
export interface Price {
  id: string;
  date: dayjs.Dayjs;
  commodity_type: string;
  commodity_id: string;
  commodity_name: string;
  value: number;
}

export interface Networth {
  date: dayjs.Dayjs;
  investmentAmount: number;
  withdrawalAmount: number;
  gainAmount: number;
  balanceAmount: number;
  balanceUnits: number;
  netInvestmentAmount: number;
}

export interface Gain {
  account: string;
  networth: Networth;
  xirr: number;
  postings: Posting[];
}

export interface AccountGain {
  account: string;
  networthTimeline: Networth[];
  xirr: number;
  postings: Posting[];
}

export interface AssetBreakdown {
  group: string;
  investmentAmount: number;
  withdrawalAmount: number;
  balanceUnits: number;
  marketAmount: number;
  xirr: number;
  gainAmount: number;
  absoluteReturn: number;
}

export interface Aggregate {
  date: dayjs.Dayjs;
  account: string;
  market_amount: number;

  // computed
  percent: number;
}

export interface CommodityBreakdown {
  commodity_name: string;
  security_name: string;
  security_id: string;
  security_type: string;
  amount: number;
  percentage: number;
}

export interface PortfolioAllocation {
  name_and_security_type: PortfolioAggregate[];
  security_type: PortfolioAggregate[];
  rating: PortfolioAggregate[];
  industry: PortfolioAggregate[];
  commodities: string[];
}

export interface PortfolioAggregate {
  id: string;
  group: string;
  sub_group: string;
  amount: number;
  percentage: number;
  breakdowns: CommodityBreakdown[];
}

export interface AllocationTarget {
  name: string;
  target: number;
  current: number;
  aggregates: { [key: string]: Aggregate };
}

export interface InvestmentYearlyCard {
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
  postings: Posting[];
  net_tax: number;
  gross_salary_income: number;
  gross_other_income: number;
  net_income: number;
  net_investment: number;
  net_expense: number;
  savings_rate: number;
}
