import { describe, expect, test } from "vitest";
import { EditorState } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { BigNumber } from "bignumber.js";
import dayjs from "dayjs";
import { sheetLanguage } from "$lib/features/sheets/language";
import {
  assertType,
  buildAST,
  Environment,
  Query,
} from "$lib/features/sheets/interpreter";
import { functions } from "$lib/features/sheets/functions";

function evaluate(source: string, scope: Record<string, unknown> = {}) {
  const state = EditorState.create({
    doc: source,
    extensions: [sheetLanguage],
  });
  const env = new Environment();
  env.scope = { ...functions, ...scope };
  env.postings = [];
  return buildAST(syntaxTree(state).topNode, state).evaluate(env);
}

describe("sheet interpreter", () => {
  test("evaluates arithmetic, percentages, grouping, and assignments", () => {
    expect(evaluate("salary = 1,000\n(salary + 500) * 10%\n-salary")).toEqual([
      { line: 1, error: false, result: "1,000.00" },
      { line: 2, error: false, result: "150.00" },
      { line: 3, error: false, result: "−1,000.00" },
    ]);
    expect(evaluate("+2\n2 ^ 3\n8 / 2\n8 - 2").map((line) => line.result))
      .toEqual(["2.00", "8.00", "4.00", "6.00"]);
  });

  test("evaluates functions, definitions, headers, and blank lines", () => {
    const result = evaluate("# Summary\n\nsquare(x) = x * x\nsquare(4)");
    expect(result).toEqual([
      { line: 1, error: false, result: "# Summary", align: "left", bold: true },
      { line: 2, error: false, result: "" },
      { line: 3, error: false, result: "" },
      { line: 4, error: false, result: "16.00" },
    ]);
  });

  test("returns readable evaluation errors", () => {
    expect(evaluate("missing + 1")[0]).toMatchObject({
      error: true,
      result: "Undefined variable missing",
    });
    expect(evaluate("missing(1)")[0]).toMatchObject({
      error: true,
      result: "Undefined function missing",
    });
  });

  test("resolves and composes posting queries", () => {
    const posting = (id: string, amount: number) => ({
      id,
      amount,
      date: dayjs("2024-01-01"),
      postings: [],
      payee: id,
      transaction_begin_line: 1,
      transaction_end_line: 2,
      file_name: "main.ledger",
      transaction_note: "",
    });
    const env = new Environment();
    env.postings = [posting("positive", 10), posting("negative", -10)] as never;
    const positive = new Query((transaction) => transaction.id === "positive");
    const negative = new Query((transaction) => transaction.id === "negative");
    expect(positive.resolve(env).map((p) => p.id)).toEqual(["positive"]);
    expect(positive.resolve(env).map((p) => p.id)).toEqual(["positive"]);
    expect(positive.or(negative).resolve(env)).toHaveLength(2);
    expect(positive.and(negative).resolve(env)).toHaveLength(0);
    expect(positive.toString()).toBe("");
  });

  test("clones and extends environments safely", () => {
    const env = new Environment();
    env.scope = { original: 1 };
    env.postings = [];
    const clone = env.clone();
    expect(clone.scope).toEqual({ original: 1 });
    clone.scope.original = 2;
    expect(env.scope.original).toBe(1);
    expect(env.extend({ added: 2 }).scope).toEqual({ original: 1, added: 2 });
    env.depth = 1001;
    expect(() => env.extend({})).toThrow("Call stack overflow");
  });

  test("checks runtime value types", () => {
    expect(() => assertType("Number", new BigNumber(1))).not.toThrow();
    expect(() => assertType("Query", new Query(() => true))).not.toThrow();
    expect(() => assertType("Postings", [])).not.toThrow();
    expect(() => assertType("Postings", new Query(() => true))).not.toThrow();
    expect(() => assertType("Number", "1")).toThrow(
      "Expected Number, got Unknown",
    );
    expect(() => assertType("Postings", 1)).toThrow(
      "Expected Postings, got Unknown",
    );
  });

  test("aggregates and transforms posting collections", () => {
    const postings = [
      {
        account: "Assets:A",
        commodity: "USD",
        quantity: 3,
        amount: 30,
        market_amount: 36,
        date: dayjs("2024-01-01"),
      },
      {
        account: "Assets:A",
        commodity: "USD",
        quantity: -1,
        amount: -10,
        market_amount: -12,
        date: dayjs("2024-02-01"),
      },
    ] as never;
    const env = new Environment();
    expect(functions.cost(env, postings).toNumber()).toBe(20);
    expect(functions.balance(env, postings).toNumber()).toBe(24);
    expect(functions.negate(env, postings)[0]).toMatchObject({
      quantity: -3,
      amount: -30,
      market_amount: -36,
    });
    expect(functions.fifo(env, postings)[0]).toMatchObject({
      quantity: 2,
      amount: 20,
      market_amount: 24,
    });
  });
});
