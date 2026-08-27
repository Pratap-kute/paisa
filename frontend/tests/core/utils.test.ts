import { lastName, parentName } from "$lib/domain/account";
import { restName } from "$lib/domain/account";
import { formatFloatUptoPrecision } from "$lib/shared/formatters/currency";
import { secondName } from "$lib/domain/account";
import { formatFloat, formatPercentage } from "$lib/shared/formatters/currency";
import { setColorPreference } from "$lib/shared/browser/theme";
import { firstNames } from "$lib/domain/account";
import { now, prefixMinutesSeconds } from "$lib/domain/time";
import { formatFixedWidthFloat } from "$lib/shared/formatters/currency";
import { buildDirectoryTree } from "$lib/shared/utils/tree";
import { getColorPreference } from "$lib/shared/browser/theme";
import { firstName } from "$lib/domain/account";
import { monthDays, setNow } from "$lib/domain/time";
import { forEachMonth, forEachYear } from "$lib/shared/formatters/date";
import {
  formatCurrencyCrudeWithPrecision,
} from "$lib/shared/formatters/currency";
import { sumPostings, transactionTotal } from "$lib/domain/transactions";
import { buildTree } from "$lib/shared/utils/tree";
import { darkenOrLighten } from "$lib/shared/theme/color";
import { darkLightColor } from "$lib/shared/browser/theme";
import { depth } from "$lib/domain/account";
import { dueDateIcon } from "$lib/shared/ui/due_date";
import { financialYear } from "$lib/domain/time";
import { forEachFinancialYear } from "$lib/shared/formatters/date";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatTextAsHtml } from "$lib/shared/ui/rich_text";
import { groupSumBy } from "$lib/domain/transactions";
import { helpUrl, postingUrl } from "$lib/shared/browser/navigation";
import { isLoggedIn, logout } from "$lib/shared/browser/auth";
import { isMobile, rem } from "$lib/shared/browser/responsive";
import { isZero } from "$lib/shared/utils/number";
import { tooltip } from "$lib/shared/charts/tooltip";
import { beforeEach, describe, expect, test } from "vitest";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import { asTransaction } from "$lib/domain/transactions";

dayjs.extend(isSameOrBefore);

describe("core utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    USER_CONFIG.locale = "en-IN";
    USER_CONFIG.display_precision = 2;
    USER_CONFIG.financial_year_starting_month = 4;
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      configurable: true,
    });
  });

  test("formats finite, non-finite, percentage, and fixed-width values", () => {
    expect(formatCurrency(1234.5)).toBe("1,234.50");
    expect(formatCurrency(-0)).toBe("0.00");
    expect(formatCurrency(Number.NaN)).toBe("0.00");
    expect(formatCurrencyCrudeWithPrecision(1200, 1)).toContain("1.2");
    expect(formatFloat(-12.5, 1)).toBe("−12.5");
    expect(formatFloatUptoPrecision(12.345, 2)).toBe("12.35");
    expect(formatPercentage(0.125, 1)).toBe("12.5%");
    expect(formatFixedWidthFloat(2, 6, 1)).toBe("   2.0");
    expect(formatFixedWidthFloat(1234, 2, 0)).toBe("1,234");
  });

  test("iterates calendar periods", () => {
    const months: string[] = [];
    forEachMonth(
      dayjs("2023-01-15"),
      dayjs("2023-03-01"),
      (d) => months.push(d.format("YYYY-MM")),
    );
    expect(months).toEqual(["2023-01", "2023-02", "2023-03"]);
    const years: number[] = [];
    forEachYear(
      dayjs("2021-06-01"),
      dayjs("2023-01-01"),
      (d) => years.push(d.year()),
    );
    expect(years).toEqual([2021, 2022, 2023]);
    expect(
      forEachFinancialYear(dayjs("2023-01-01"), dayjs("2025-01-01"))
        .map((d) => d.format("YYYY-MM")),
    ).toEqual([
      "2022-04",
      "2023-04",
      "2024-04",
    ]);
  });

  test("handles account names and URLs", () => {
    const account = "Assets:Bank:Checking";
    expect(firstName(account)).toBe("Assets");
    expect(lastName(account)).toBe("Checking");
    expect(secondName(account)).toBe("Bank");
    expect(firstNames(account, 2)).toBe("Assets:Bank");
    expect(restName(account)).toBe("Bank:Checking");
    expect(parentName(account)).toBe("Assets:Bank");
    expect(depth(account)).toBe(3);
    expect(helpUrl("goals")).toBe("https://paisa.fyi/reference/goals");
    expect(
      postingUrl(
        { file_name: "main file.ledger", transaction_begin_line: 8 } as never,
      ),
    )
      .toBe("/ledger/editor/main%20file.ledger#8");
  });

  test("builds directory and account trees", () => {
    const files = [
      { type: "file", name: "z.ledger", content: "", versions: [] },
      { type: "file", name: "accounts/bank.ledger", content: "", versions: [] },
    ] as const;
    const tree = buildDirectoryTree(files as never);
    expect(tree[0].name).toBe("accounts");
    expect(tree[1].name).toBe("z.ledger");
    const accounts = buildTree(
      [{ account: "Assets:Cash", value: 1 }, {
        account: "Assets:Bank",
        value: 2,
      }],
      (item) => item.account,
    ) as Array<{ account: string; _children: unknown[] }>;
    expect(accounts).toHaveLength(1);
    expect(accounts[0]._children).toHaveLength(2);
  });

  test("formats tooltip content and responsive dimensions", () => {
    const html = tooltip([["Rent", ["₹10", "has-text-right"]]], {
      header: "Expenses",
      total: "₹10",
    });
    expect(html).toContain("Expenses");
    expect(html).toContain("colspan='2'");
    expect(html).toContain("Total");
    expect(isMobile()).toBe(false);
    expect(rem(10)).toBe(10);
    Object.defineProperty(window, "innerWidth", {
      value: 390,
      configurable: true,
    });
    expect(isMobile()).toBe(true);
    expect(rem(10)).toBe(8.57);
  });

  test("handles dates, colors, and theme preferences", () => {
    USER_CONFIG.financial_year_starting_month = 1;
    expect(financialYear(dayjs("2023-02-01"))).toBe("2023");
    USER_CONFIG.financial_year_starting_month = 4;
    expect(financialYear(dayjs("2023-02-01"))).toBe("2022 - 23");
    expect(financialYear(dayjs("2023-05-01"))).toBe("2023 - 24");
    expect(getColorPreference()).toBe("light");
    setColorPreference("dark");
    expect(getColorPreference()).toBe("dark");
    expect(darkLightColor("black", "white")).toBe("black");
    expect(darkenOrLighten("#ffffff")).not.toBe("#ffffff");
    expect(darkenOrLighten("#000000")).not.toBe("#000000");
    expect(darkenOrLighten("#ffffff")).toBe("#9b9b9b");
    expect(darkenOrLighten("#000000")).toBe("#555555");
    expect(darkenOrLighten("rgb(120, 80, 40)")).toBe("#ddab7f");
  });

  test("handles posting calculations and transformations", () => {
    const postings = [
      {
        id: "1",
        account: "Assets:Cash",
        amount: 20,
        date: dayjs("2023-01-01"),
      },
      {
        id: "2",
        account: "Income:CapitalGains:Equity",
        amount: -5,
        date: dayjs("2023-01-01"),
      },
    ] as never;
    expect(sumPostings(postings)).toBe(25);
    expect(groupSumBy(postings, "account")).toEqual({
      "Assets:Cash": 20,
      "Income:CapitalGains:Equity": -5,
    });
    expect(
      transactionTotal(
        { postings: [{ amount: -10 }, { amount: 25 }] } as never,
      ),
    )
      .toBe(25);
    expect(
      asTransaction({
        ...postings[0],
        payee: "Shop",
        transaction_begin_line: 2,
        transaction_end_line: 4,
        file_name: "main.ledger",
        transaction_note: "note",
      } as never).fileName,
    ).toBe("main.ledger");
    expect(formatTextAsHtml(" hello\nworld ")).toBe("<p>hello<br />world</p>");
  });

  test("handles schedules and simple predicates", () => {
    setNow(dayjs("2024-01-15"));
    expect(now().format("YYYY-MM-DD")).toBe("2024-01-15");
    expect(monthDays("2024-02").days.length).toBeGreaterThanOrEqual(28);
    expect(prefixMinutesSeconds("1 * *|2 * *")).toBe("0 0 1 * *|0 0 2 * *");
    expect(isZero(0.00001)).toBe(true);
    expect(isZero(0.1)).toBe(false);
    expect(dueDateIcon(dayjs("2024-01-01"), null).color).toBe(
      "paisa-text-danger",
    );
    expect(dueDateIcon(dayjs("2024-02-01"), null).color).toBe(
      "paisa-text-muted",
    );
    expect(dueDateIcon(dayjs("2024-01-01"), dayjs("2024-01-01")).color)
      .toBe("paisa-text-success");
    expect(dueDateIcon(dayjs("2024-01-01"), dayjs("2024-01-02")).color)
      .toBe("paisa-text-warning");
  });

  test("tracks authentication token state", () => {
    expect(isLoggedIn()).toBe(false);
    localStorage.setItem("token", "value");
    expect(isLoggedIn()).toBe(true);
    logout();
    expect(isLoggedIn()).toBe(false);
  });
});
