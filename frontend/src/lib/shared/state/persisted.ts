import { PersistedState } from "./persisted.svelte";
import { Ref } from "./ref.svelte";

export const obscure = new PersistedState("obscure", false);

export const cashflowExpenseDepthAllowed = new Ref({ min: 1, max: 1 });
export const cashflowExpenseDepth = new PersistedState(
  "cashflowExpenseDepth",
  0,
);
export const cashflowIncomeDepthAllowed = new Ref({ min: 1, max: 1 });
export const cashflowIncomeDepth = new PersistedState("cashflowIncomeDepth", 0);
export const cashflowViewMode = new PersistedState<"treemap" | "sankey">(
  "cashflowViewMode",
  "treemap",
);

export function setCashflowDepthAllowed(expense: number, income: number) {
  cashflowExpenseDepthAllowed.value = { min: 1, max: expense };
  if (
    cashflowExpenseDepth.value === 0 ||
    cashflowExpenseDepth.value > expense
  ) {
    cashflowExpenseDepth.value = expense;
  }

  cashflowIncomeDepthAllowed.value = { min: 1, max: income };
  if (cashflowIncomeDepth.value === 0 || cashflowIncomeDepth.value > income) {
    cashflowIncomeDepth.value = income;
  }
}
