// deno-lint-ignore-file no-explicit-any -- Handlebars invokes helpers with heterogeneous positional values and option objects.
import dayjs from "dayjs";
import { capitalize, isString, round, trim } from "es-toolkit";
import { predictionSession } from "../prediction/session";
import { isEmpty } from "$lib/core/collection";

const STOP_WORDS = ["", "fof", "growth", "direct", "plan", "the"];

function nextChar(key: string): string {
  if (key === "Z") {
    return "AA";
  } else {
    const last = key.slice(-1);
    const butlast = key.slice(0, -1);
    if (last === "Z") {
      return nextChar(butlast) + "A";
    } else {
      return butlast + String.fromCharCode(last.charCodeAt(0) + 1);
    }
  }
}

function scrubAmount(str: string) {
  const amount = trim(str)
    .replace(/\((.+)\)/, "-$1")
    .replace(/[^0-9.-]/g, "");

  if (!Number.isNaN(Number(amount)) && !Number.isNaN(parseFloat(amount))) {
    return amount;
  }
}

function parseAmount(str: string | number): number {
  if (typeof str === "number") {
    return str;
  }

  const amount = scrubAmount(str);
  if (amount) {
    return parseFloat(amount);
  }

  return Number.NaN;
}

export default {
  eq: (a: any, b: any) => a === b,
  ne: (a: any, b: any) => a !== b,
  not: (value: any) => !value,
  gte: (a: string | number, b: string | number) =>
    parseAmount(a) >= parseAmount(b),
  gt: (a: string | number, b: string | number) =>
    parseAmount(a) > parseAmount(b),
  lte: (a: string | number, b: string | number) =>
    parseAmount(a) <= parseAmount(b),
  lt: (a: string | number, b: string | number) =>
    parseAmount(a) < parseAmount(b),
  negate: (value: string) => parseAmount(value) * -1,
  round(str: string, options: any) {
    return round(parseAmount(str), options.hash.precision || 0);
  },
  and(...args: any[]) {
    return Array.prototype.every.call(
      Array.prototype.slice.call(args, 0, -1),
      Boolean,
    );
  },
  or(...args: any[]) {
    for (const arg of Array.prototype.slice.call(args, 0, -1)) {
      if (arg) {
        return arg;
      }
    }
  },
  isDate(str: string, format: string) {
    if (!isString(str)) {
      return false;
    }
    return dayjs(trim(str), format, true).isValid();
  },
  predictAccount(...args: any) {
    const options = args.pop();
    return predictionSession.predictFromHelper(args, options).account;
  },
  isBlank(str: string) {
    return isEmpty(str) || trim(str) === "";
  },
  amount(str: string, options: any) {
    const amount = scrubAmount(str);
    return amount || options.hash.default || "";
  },
  date(str: string, format: string) {
    return dayjs(trim(str), format, true).format("YYYY/MM/DD");
  },
  trim(str: string) {
    return trim(str);
  },
  oneline(str: string) {
    if (!isString(str)) {
      return;
    }
    return str
      .replace(/([A-Za-z0-9])\r?\n([A-Za-z0-9])/g, "$1$2")
      .replace(/\s+/g, " ")
      .trim();
  },
  replace(str: string, search: string, replace: string) {
    if (!isString(str)) {
      return;
    }
    return str.replaceAll(search, replace);
  },
  textRange(fromColumn: string, toColumn: string, options: any) {
    const row: Record<string, string> = options.data.root.ROW;
    const cells = [];
    let i = 0;
    let current = fromColumn;
    while (i < 1000) {
      cells.push(row[current]);
      if (current === toColumn) {
        break;
      }
      current = nextChar(current);
      i++;
    }
    return cells.join(options.hash.separator || " ");
  },
  regexpTest(str: string, regexp: string) {
    if (!isString(str)) {
      return;
    }

    return new RegExp(regexp).test(str);
  },
  regexpMatch(str: string, regexp: string, options: any) {
    if (!isString(str)) {
      return;
    }

    const group = options.hash.group || 0;

    const match = new RegExp(regexp).exec(str);
    if (match) {
      return match[group];
    }
  },
  match(str: string, options: any) {
    for (
      const [value, regexp] of Object.entries(
        options.hash as Record<string, string>,
      )
    ) {
      if (new RegExp(regexp).test(str)) {
        return value;
      }
    }
    return null;
  },
  findAbove(column: string, options: any) {
    const regexp = new RegExp(options.hash.regexp || ".+");
    let i: number = options.data.root.ROW.index - 1;
    while (i >= 0) {
      const row = options.data.root.SHEET[i];
      const cell = row[column] || "";
      const match = cell.match(regexp);
      if (match) {
        if (options.hash.group) {
          return match[options.hash.group];
        }
        return cell;
      }
      i--;
    }
    return null;
  },
  findBelow(column: string, options: any) {
    const regexp = new RegExp(options.hash.regexp || ".+");
    let i: number = options.data.root.ROW.index + 1;
    while (i < options.data.root.SHEET.length) {
      const row = options.data.root.SHEET[i];
      const cell = row[column] || "";
      const match = cell.match(regexp);
      if (match) {
        if (options.hash.group) {
          return match[options.hash.group];
        }
        return cell;
      }
      i++;
    }
    return null;
  },
  acronym(str: string) {
    return str
      .replaceAll(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter((s) => s.length > 0 && !STOP_WORDS.includes(s.toLowerCase()))
      .map((s) => s[0].toUpperCase())
      .join("");
  },
  toLowerCase(str: string) {
    return str.toLowerCase();
  },
  toUpperCase(str: string) {
    return str.toUpperCase();
  },
  capitalize(str: string) {
    return capitalize(str);
  },
};
