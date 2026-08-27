import {
  api,
  createAsyncState,
  type DtoBudgetsSummaryResponse,
  type DtoExpenseResponse,
} from "$lib/api";

export function createExpenseState() {
  return createAsyncState<void, DtoExpenseResponse | null>(
    async (_args, signal) => {
      const response = await api.expense.getExpense({ signal });
      return response;
    },
    null,
  );
}

export function createBudgetState() {
  return createAsyncState<void, DtoBudgetsSummaryResponse | null>(
    async (_args, signal) => {
      const response = await api.budget.getBudget({ signal });
      return response;
    },
    null,
  );
}
