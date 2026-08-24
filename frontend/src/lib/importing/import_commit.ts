import type { RenderedRow, RenderError } from "./spreadsheet";

export const emptyRenderMetadata = {
  content: "",
  rows: [] as RenderedRow[],
  generatedCount: 0,
  errors: [] as RenderError[],
};

export function displayCell(cell: unknown): string {
  return (cell ?? "") as string;
}

export type ParseCommit =
  | { ok: true; fileName: string; data: unknown[][] }
  | { ok: false; fileName: string; error: string };

export function commitParseOutcome(
  fileName: string,
  results: { error?: string; data?: unknown[][] } | null,
  catchMessage?: string,
): ParseCommit {
  if (catchMessage) {
    return { ok: false, fileName, error: catchMessage };
  }
  if (results?.error) {
    return { ok: false, fileName, error: results.error };
  }
  return { ok: true, fileName, data: results?.data ?? [] };
}
