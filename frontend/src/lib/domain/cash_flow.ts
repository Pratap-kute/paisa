import type dayjs from "dayjs";
import type { Posting } from "$lib/domain/ledger";
export interface IncomeStatement {
  startingBalance: number;
  endingBalance: number;
  date: dayjs.Dayjs;
  income: Record<string, number>;
  interest: Record<string, number>;
  equity: Record<string, number>;
  pnl: Record<string, number>;
  liabilities: Record<string, number>;
  tax: Record<string, number>;
  expenses: Record<string, number>;
}

export interface CashFlow {
  date: dayjs.Dayjs;
  income: number;
  liabilities: number;
  expenses: number;
  investment: number;
  tax: number;
  checking: number;
  balance: number;
}

export interface Income {
  date: dayjs.Dayjs;
  postings: Posting[];
}

export interface IncomeYearlyCard {
  start_date: dayjs.Dayjs;
  end_date: dayjs.Dayjs;
  postings: Posting[];
  net_tax: number;
  gross_income: number;
  net_income: number;
}

export interface Budget {
  date: dayjs.Dayjs;
  accounts: AccountBudget[];
  endOfMonthBalance: number;
  availableThisMonth: number;
  forecast: number;
}

export interface AccountBudget {
  account: string;
  date: dayjs.Dayjs;
  actual: number;
  budgeted: number;
  forecast: number;
  available: number;
  rollover: number;
  expenses: Posting[];
}
