import { groupBy } from "es-toolkit";
import { format } from "./journal";
import type { LedgerFile, Transaction } from "../core/utils";
import { sortBy } from "$lib/core/collection";

interface OperationResult {
  updated: boolean;
  content: string;
}

export function applyChanges(
  files: LedgerFile[],
  transactions: Transaction[],
  operation: string,
  args: RenameAccountArgs,
) {
  let updatedTransactionsCount = 0;
  const transactionsGrouped = groupBy(transactions, (t) => t.fileName);
  const newFiles = files.map((file) => {
    const transactions = transactionsGrouped[file.name] || [];

    const lines = file.content.split("\n");
    const sortedTransactions = sortBy(transactions, (t) => t.beginLine);
    let lastLine = 0;
    const newLines: string[] = [];
    for (const transaction of sortedTransactions) {
      newLines.push(...lines.slice(lastLine, transaction.beginLine - 1));
      const oldLines = lines.slice(
        transaction.beginLine - 1,
        transaction.endLine,
      );

      let result: OperationResult;
      switch (operation) {
        case "rename_account":
          result = renameAccount(oldLines.join("\n"), transaction, args);
          newLines.push(result.content);
          break;
      }
      if (result.updated) {
        updatedTransactionsCount++;
      }
      lastLine = transaction.endLine;
    }

    newLines.push(...lines.slice(lastLine));

    return { ...file, content: newLines.join("\n") };
  });

  return {
    newFiles,
    updatedTransactionsCount,
  };
}

interface RenameAccountArgs {
  oldAccountName: string;
  newAccountName: string;
}

function renameAccount(
  text: string,
  transaction: Transaction,
  args: RenameAccountArgs,
): OperationResult {
  const found = transaction.postings.some(
    (p) => p.account === args.oldAccountName,
  );
  if (!found) {
    return { updated: false, content: text };
  }

  const regex = new RegExp(
    `^((?:\t|\\s{2})\\s*)(${
      escapeRegExp(args.oldAccountName)
    })((?:\t|\\s{2}).*|\\s*)$`,
  );
  const lines = text.split("\n");
  const content = format(
    lines.map((line) => line.replace(regex, `$1${args.newAccountName}$3`)).join(
      "\n",
    ),
  );

  return { updated: true, content };
}

function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
