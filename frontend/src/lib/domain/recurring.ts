import type dayjs from "dayjs";
import type { Transaction } from "$lib/domain/ledger";
export interface TransactionSchedule {
  actual: dayjs.Dayjs | null;
  scheduled: dayjs.Dayjs;
  transaction: Transaction | null;
  key: string;
  amount: number;
}

export interface TransactionSequence {
  transactions: Transaction[];
  period: string;
  key: string;
  interval: number;

  // computed
  schedules: TransactionSchedule[];
  pastSchedules: TransactionSchedule[];
  futureSchedules: TransactionSchedule[];
  schedulesByMonth: Record<string, TransactionSchedule[]>;
}
