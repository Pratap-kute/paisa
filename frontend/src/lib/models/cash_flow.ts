import type dayjs from "dayjs";
import type { Transaction } from "./ledger";

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

export interface TransactionSchedule {
  actual: dayjs.Dayjs;
  scheduled: dayjs.Dayjs;
  transaction: Transaction;
  key: string;
  amount: number;
}

export interface TransactionSequence {
  transactions: Transaction[];
  period: string;
  key: string;
  interval: number;
  schedules: TransactionSchedule[];
  pastSchedules: TransactionSchedule[];
  futureSchedules: TransactionSchedule[];
  schedulesByMonth: Record<string, TransactionSchedule[]>;
}
