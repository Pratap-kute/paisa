import {
  api,
  createAsyncState,
  type DtoBalancedPostingResponse,
  type DtoTransactionResponse,
} from "$lib/api";

export function createTransactionsState() {
  return createAsyncState<void, DtoTransactionResponse[]>(
    async (_args, signal) => {
      const response = await api.transaction.getTransactions({ signal });
      return response.transactions || [];
    },
    [],
  );
}

export function createBalancedPostingsState() {
  return createAsyncState<void, DtoBalancedPostingResponse[]>(
    async (_args, signal) => {
      const response = await api.transaction.getBalancedPostings({ signal });
      return response.balancedPostings || [];
    },
    [],
  );
}
