import _ from "lodash";
import { type Posting, secondName } from "../core/utils";

export function byExpenseGroup(expenses: Posting[]) {
  return _.chain(expenses)
    .groupBy(expenseGroup)
    .mapValues((ps, category) => {
      return {
        category: category,
        postings: ps,
        total: _.sumBy(ps, (p) => p.amount),
      };
    })
    .value();
}

export function expenseGroup(posting: Posting) {
  return secondName(posting.account);
}
