import type dayjs from "dayjs";
import type { Posting, Transaction } from "$lib/domain/ledger";
export interface InterestOverview {
  date: dayjs.Dayjs;
  drawn_amount: number;
  repaid_amount: number;
  interest_amount: number;
}

export interface Interest {
  account: string;
  overview_timeline: InterestOverview[];
  apr: number;
}

export interface LiabilityBreakdown {
  group: string;
  drawn_amount: number;
  repaid_amount: number;
  interest_amount: number;
  balance_amount: number;
  apr: number;
}

export interface CreditCardBill {
  openingBalance: number;
  closingBalance: number;
  debits: number;
  credits: number;
  statementStartDate: dayjs.Dayjs;
  statementEndDate: dayjs.Dayjs;
  dueDate: dayjs.Dayjs;
  paidDate: dayjs.Dayjs;
  postings: Posting[];
  transactions: Transaction[];
}

export interface CreditCardSummary {
  account: string;
  network: string;
  number: string;
  balance: number;
  bills: CreditCardBill[];
  creditLimit: number;
  expirationDate: dayjs.Dayjs;
  yearlySpends: { [year: string]: { [month: string]: number } };
}
