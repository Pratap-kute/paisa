export interface PredictionHistoryEntry {
  transactionId: string;
  date: string;
  payee: string;
  sourceAccount?: string;
  categoryAccount: string;
  amount: number;
  absoluteAmount: number;
  direction?: "DEBIT" | "CREDIT";
  commodity: string;
}
