import type dayjs from "dayjs";
export interface Posting {
  id: string;
  date: dayjs.Dayjs;
  payee: string;
  account: string;
  commodity: string;
  quantity: number;
  amount: number;
  status: string;
  tag_recurring: string;
  transaction_begin_line: number;
  transaction_end_line: number;
  file_name: string;
  note: string;
  transaction_note: string;

  market_amount: number;
  balance: number;
}

export interface Transaction {
  id: string;
  date: dayjs.Dayjs;
  payee: string;
  beginLine: number;
  endLine: number;
  fileName: string;
  note: string;
  postings: Posting[];
}

export interface BalancedPosting {
  from: Posting;
  to: Posting;
}

export interface LedgerFile extends PaisaFile {}

export interface Directory {
  type: "directory";
  name: string;
  children: Array<Directory | LedgerFile | SheetFile>;
}

export interface SheetFile extends PaisaFile {}

export interface LedgerFileError {
  line_from: number;
  line_to: number;
  error: string;
  message: string;
}

export interface SheetFileError {
  line_from: number;
  line_to: number;
  error: string;
  message: string;
}
interface PaisaFile {
  type: "file";
  name: string;
  content: string;
  versions: string[];
}
