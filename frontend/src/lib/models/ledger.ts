import type dayjs from "dayjs";

export interface AutoCompleteItem {
  label: string;
  id: string;
}

export interface AutoCompleteField {
  id: string;
  label: string;
  help: string;
  inputType: string;
}

export interface PriceProvider {
  code: string;
  fields: AutoCompleteField[];
  label: string;
  description: string;
}

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
  postings: Posting[];
  tag_period: string;
  tag_recurring: string;
  note: string;
  fileName: string;
  beginLine: number;
  endLine: number;
  amount: number;
}

export interface LedgerFile {
  name: string;
  content: string;
  path: string;
  type: "file";
  versions?: string[];
}

export interface SheetFile {
  name: string;
  content: string;
  path: string;
  type: "file";
  versions?: string[];
}

export interface LedgerFileError {
  line_from: number;
  line_to: number;
  col_from: number;
  col_to: number;
  message: string;
  level: "error" | "warning" | "info";
}

export interface SheetFileError {
  line_from: number;
  line_to: number;
  col_from: number;
  col_to: number;
  message: string;
}

export interface SheetLineResult {
  result: string;
  bold?: boolean;
  underline?: boolean;
  align?: "left" | "right";
  error?: boolean;
}

export interface ImportTemplate {
  id: string;
  name: string;
  content: string;
  template_type: "builtin" | "custom";
}
