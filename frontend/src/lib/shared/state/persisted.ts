import { untrack } from "svelte";
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

// Called from effects, so the current depths are read without subscribing.
export function setCashflowDepthAllowed(expense: number, income: number) {
  cashflowExpenseDepthAllowed.value = { min: 1, max: expense };
  const expenseDepth = untrack(() => cashflowExpenseDepth.value);
  if (expenseDepth === 0 || expenseDepth > expense) {
    cashflowExpenseDepth.value = expense;
  }

  cashflowIncomeDepthAllowed.value = { min: 1, max: income };
  const incomeDepth = untrack(() => cashflowIncomeDepth.value);
  if (incomeDepth === 0 || incomeDepth > income) {
    cashflowIncomeDepth.value = income;
  }
}
