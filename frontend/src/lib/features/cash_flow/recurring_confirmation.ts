import { sha256Hex } from "$lib/shared/utils/crypto";
import { api } from "$lib/api";
import type { Transaction } from "$lib/domain/ledger";
import type { RecurringAnalysis } from "$lib/domain/recurring_analysis";

export interface RecurringFileEdit {
  name: string;
  content: string;
  expected_content: string;
}

/** Insert metadata only; preserve all existing lines, comments, and line endings. */
export function tagRecurringContent(
  content: string,
  transactions: Transaction[],
  key: string,
  cli: string,
): string {
  if (!key || /[\r\n"\\]/.test(key)) {
    throw new Error("Invalid recurring identity");
  }
  if (!["ledger", "hledger", "beancount"].includes(cli)) {
    throw new Error("Unsupported ledger format");
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(newline);
  const positions = new Set<number>();
  for (const t of [...transactions].sort((a, b) => b.beginLine - a.beginLine)) {
    const index = t.beginLine - 1;
    if (index < 0 || index >= lines.length || positions.has(index)) {
      throw new Error("Transaction location changed. Reload ledger history.");
    }
    const header = lines[index];
    const date = t.date.format("YYYY-MM-DD");
    const payeeMatches = cli === "beancount"
      ? (header.match(/"(?:\\.|[^"\\])*"/g) ?? []).map((value) =>
        JSON.parse(value) as string
      ).filter(Boolean).join(" | ") === t.payee
      : header.includes(t.payee);
    if (
      !header.replaceAll("/", "-").startsWith(date) || !payeeMatches
    ) throw new Error("Transaction source changed. Reload ledger history.");
    const block = lines.slice(index, t.endLine);
    if (block.some((line) => /(?:Recurring\s*:|recurring\s*:)/.test(line))) {
      throw new Error(
        "This transaction already has recurring metadata. Reload ledger history.",
      );
    }
    if (
      !t.postings.every((p) => block.some((line) => line.includes(p.account)))
    ) throw new Error("Transaction postings changed. Reload ledger history.");
    positions.add(index);
    lines.splice(
      index + 1,
      0,
      cli === "beancount" ? `  recurring: "${key}"` : `    ; Recurring: ${key}`,
    );
  }
  return lines.join(newline);
}

export async function recurringIdentity(
  candidate: RecurringAnalysis,
): Promise<string> {
  const suffix = (await sha256Hex(candidate.key)).slice(0, 12);
  return `${candidate.occurrences[0].merchantKey} [${suffix}]`;
}

export async function prepareRecurringConfirmation(
  candidate: RecurringAnalysis,
  cli: string,
): Promise<RecurringFileEdit[]> {
  const identity = await recurringIdentity(candidate);
  const files = new Map<string, Transaction[]>();
  for (const t of candidate.transactions) {
    const group = files.get(t.fileName) ?? [];
    group.push(t);
    files.set(t.fileName, group);
  }
  const response = await api.editor.getEditorFiles();
  const edits = [...files].map(([name, transactions]) => {
    const original = response.files?.find((file) => file.name === name)
      ?.content;
    if (typeof original !== "string") throw new Error(`Could not read ${name}`);
    return {
      name,
      content: tagRecurringContent(original, transactions, identity, cli),
      expected_content: original,
    };
  });
  for (const edit of edits) {
    const result = await api.editor.validateEditorFile(edit);
    if (result.errors?.length) {
      throw new Error(
        `Ledger validation failed for ${edit.name}: ${
          result.errors[0].message
        }`,
      );
    }
  }
  return edits;
}

export async function saveRecurringConfirmation(
  edits: RecurringFileEdit[],
): Promise<void> {
  let saved = 0;
  for (const edit of edits) {
    try {
      const response = await api.editor.saveEditorFile(edit);
      if (response.saved) saved++;
      if (!response.saved || !response.synced) {
        throw new Error(
          response.message || "Ledger save or synchronization failed",
        );
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Ledger save failed";
      throw new Error(
        `${message}. ${saved} of ${edits.length} files saved. Reload history before retrying; saved tags remain in the ledger.`,
      );
    }
  }
}
