import Papa from "papaparse";
import type * as XLSXTypes from "xlsx";
import { trim } from "es-toolkit";
import { format } from "$lib/ledger/journal";
import { pdf2array } from "./pdf";
import { assign, each, isEmpty, map } from "$lib/shared/utils/collection";

interface Result {
  data: string[][];
  error?: string;
}

type SpreadsheetRow = Record<string, string | number>;

export interface RenderedRow {
  sourceRowIndex: number;
  rawRendered: string;
  formattedRendered: string;
  lineRange: {
    from: number;
    to: number;
  } | null;
}

export interface RenderError {
  sourceRowIndex: number;
  message: string;
}

export interface RenderMetadata {
  content: string;
  rows: RenderedRow[];
  generatedCount: number;
  errors: RenderError[];
}

export function parse(file: File): Promise<Result> {
  let extension = file.name.split(".").pop();
  extension = extension?.toLowerCase();
  if (extension === "csv" || extension === "txt") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseXLSX(file);
  } else if (extension === "pdf") {
    return parsePDF(file);
  }
  throw new Error(`Unsupported file type ${extension}`);
}

export function columnIndexToLetter(index: number): string {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function asRows(result: Result): SpreadsheetRow[] {
  return map(result.data, (row, i) => {
    return Object.fromEntries([
      ...Array.from(
        row,
        (cell, j) => [columnIndexToLetter(j), cell] as const,
      ),
      ["index", i],
    ]);
  });
}

function generateColumnRefs(maxCols = 702): Record<string, string> {
  const refs: Record<string, string> = {};
  for (let i = 0; i < maxCols; i++) {
    const col = columnIndexToLetter(i);
    refs[col] = col;
  }
  return refs;
}

const COLUMN_REFS = generateColumnRefs(702);

export function render(
  rows: SpreadsheetRow[],
  template: Handlebars.TemplateDelegate,
  options: { reverse?: boolean; trim?: boolean } = {},
) {
  const output: string[] = [];
  each(rows, (row) => {
    let rendered = template(assign({ ROW: row, SHEET: rows }, COLUMN_REFS));
    if (options.trim) {
      rendered = trim(rendered);
    }
    if (!isEmpty(rendered)) {
      output.push(rendered);
    }
  });
  if (options.reverse) {
    output.reverse();
  }

  if (options.trim) {
    return format(output.join("\n\n"));
  } else {
    return format(output.join(""));
  }
}

export function renderWithMetadata(
  rows: SpreadsheetRow[],
  template: Handlebars.TemplateDelegate,
  options: { reverse?: boolean; trim?: boolean } = {},
): RenderMetadata {
  const output: string[] = [];
  const renderedRows: RenderedRow[] = [];
  const errors: RenderError[] = [];

  each(rows, (row, sourceRowIndex) => {
    try {
      let rendered = template(assign({ ROW: row, SHEET: rows }, COLUMN_REFS));
      if (options.trim) {
        rendered = trim(rendered);
      }
      if (!isEmpty(rendered)) {
        output.push(rendered);
        renderedRows.push({
          sourceRowIndex,
          rawRendered: rendered,
          formattedRendered: format(rendered),
          lineRange: null,
        });
      }
    } catch (error) {
      errors.push({
        sourceRowIndex,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (options.reverse) {
    output.reverse();
    renderedRows.reverse();
  }

  const separator = options.trim ? "\n\n" : "";
  const content = format(output.join(separator));
  let nextLine = 1;
  const blankLinesBetweenRows = options.trim ? 1 : 0;

  each(renderedRows, (row, index) => {
    const lineCount = row.formattedRendered.split("\n").length;
    row.lineRange = {
      from: nextLine,
      to: nextLine + lineCount - 1,
    };
    nextLine += lineCount;
    if (index < renderedRows.length - 1) {
      nextLine += blankLinesBetweenRows;
    }
  });

  return {
    content,
    rows: renderedRows,
    generatedCount: renderedRows.length,
    errors,
  };
}

function parseCSV(file: File): Promise<Result> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: function (results) {
        resolve(results);
      },
      error: function (error) {
        reject(error);
      },
      delimitersToGuess: [
        ",",
        "\t",
        "|",
        ";",
        Papa.RECORD_SEP,
        Papa.UNIT_SEP,
        "^",
      ],
    });
  });
}

async function parseXLSX(file: File): Promise<Result> {
  const buffer = await readFile(file);
  const XLSX = await import("xlsx") as typeof XLSXTypes;
  try {
    const sheet = XLSX.read(buffer, { type: "binary" });
    const json = XLSX.utils.sheet_to_json<string[]>(
      sheet.Sheets[sheet.SheetNames[0]],
      {
        header: 1,
        blankrows: false,
        rawNumbers: false,
      },
    );
    return { data: json };
  } catch (e) {
    if (/password-protected/.test(e.message)) {
      const password = prompt(
        "Please enter the password to open this XLSX file. Press cancel to exit.",
      );
      if (password === null) {
        return { data: [], error: "Password required." };
      }

      try {
        // Load the browser bundle only for password-protected workbooks. The
        // default entry imports Node modules and this fallback is relatively
        // large, so it should not be part of the normal import route.
        const XlsxPopulate = await import(
          "xlsx-populate/browser/xlsx-populate.js"
        );
        const workbook = await XlsxPopulate.fromDataAsync(buffer, { password });
        const sheet = workbook.sheet(0);
        if (sheet) {
          let json = sheet.usedRange().value();
          json = map(json, (row) => {
            return map(row, (cell) => {
              if (cell) {
                return cell.toString();
              }
              return "";
            });
          });

          return { data: json };
        }
      } catch (_e) {
        // follow through to the error below
      }

      return { data: [], error: "Unable to parse Password protected XLSX" };
    }
    throw e;
  }
}

async function parsePDF(file: File): Promise<Result> {
  const buffer = await readFile(file);
  const array = await pdf2array(buffer);
  return { data: array };
}

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result as ArrayBuffer);
    };
    reader.onerror = (event) => {
      reject(event);
    };
    reader.readAsArrayBuffer(file);
  });
}
