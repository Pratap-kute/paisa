import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, expect, test } from "vitest";
import LedgerBalance from "./LedgerBalance.svelte";

afterEach(() => {
  cleanup();
});

test("renders multi-commodity balances with long names correctly without hiding balances or corrupting hierarchy (Issue #5)", () => {
  const sampleOutput = `    100.0000 FundA
50.0000 VeryLongFundCommodityName
        1000.0000 INR  Assets
        1000.0000 INR    Checking:BankA
    100.0000 FundA
50.0000 VeryLongFundCommodityName    Debt:MF
    100.0000 FundA      FundA
50.0000 VeryLongFundCommodityName      VeryLongFundCommodityName
       -36000.0000 INR  Equity:OpeningBalance
--------------------
       -35000.0000 INR
    100.0000 FundA
50.0000 VeryLongFundCommodityName
`;

  render(LedgerBalance, {
    props: {
      output: sampleOutput,
    },
  });

  // Assets root heading with aggregate
  expect(screen.getByText("Assets")).toBeInTheDocument();
  expect(screen.getAllByText("₹1,000")).toHaveLength(2); // 1 in Assets heading total, 1 in Checking:BankA

  // Checking:BankA should be rendered with its balance displayed (not suppressed!)
  expect(screen.getByText("Checking:BankA")).toBeInTheDocument();

  // Debt:MF heading and leaf commodities should be rendered
  expect(screen.getByText("Debt:MF")).toBeInTheDocument();
  expect(screen.getAllByText("FundA").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("VeryLongFundCommodityName").length)
    .toBeGreaterThanOrEqual(1);

  // Equity:OpeningBalance should be rendered
  expect(screen.getByText("Equity:OpeningBalance")).toBeInTheDocument();
  expect(screen.getByText("-₹36,000")).toBeInTheDocument();

  // Net balance
  expect(screen.getByText("Net balance")).toBeInTheDocument();
  expect(screen.getByText("-₹35,000")).toBeInTheDocument();
});

test("renders real hierarchical ledger balance tree with intermediate headings and sub-totals", () => {
  const sampleOutput = `     36,990.0000 INR  Assets
     36,990.0000 INR    Appliances:TV
     29,135.1626 INR    Checking
     11,024.3000 INR      AXIS
     16,000.0000 INR      Cash:Wife
      1,855.4400 INR      CentralBank
        255.4226 INR      SBI
  2,061,527.1384 INR  Expenses
     58,027.1700 INR    Food
      5,202.0000 INR      Cafe
     31,032.1700 INR      Restaurants
     21,793.0000 INR      Takeout
--------------------
    102.9858 ABSLMMF
   -371,983.3455 INR
`;

  render(LedgerBalance, {
    props: {
      output: sampleOutput,
    },
  });

  // Root headings
  expect(screen.getByText("Assets")).toBeInTheDocument();
  expect(screen.getAllByText("₹36,990")).toHaveLength(2); // In Assets root total and Appliances:TV
  expect(screen.getByText("Expenses")).toBeInTheDocument();
  expect(screen.getByText("₹2,061,527.14")).toBeInTheDocument();

  // Intermediate categories and leaves
  expect(screen.getByText("Appliances:TV")).toBeInTheDocument();
  expect(screen.getByText("Checking")).toBeInTheDocument();
  expect(screen.getByText("AXIS")).toBeInTheDocument();
  expect(screen.getByText("Cash:Wife")).toBeInTheDocument();
  expect(screen.getByText("CentralBank")).toBeInTheDocument();
  expect(screen.getByText("SBI")).toBeInTheDocument();

  expect(screen.getByText("Food")).toBeInTheDocument();
  expect(screen.getByText("Cafe")).toBeInTheDocument();
  expect(screen.getByText("Restaurants")).toBeInTheDocument();
  expect(screen.getByText("Takeout")).toBeInTheDocument();

  // Net balance
  expect(screen.getByText("Net balance")).toBeInTheDocument();
  expect(screen.getByText("-₹371,983.35")).toBeInTheDocument();
});

test("renders simple single-account balance", () => {
  const sampleOutput = `         500.00 USD  Checking
--------------------
         500.00 USD
`;

  render(LedgerBalance, {
    props: {
      output: sampleOutput,
    },
  });

  expect(screen.getByText("Checking")).toBeInTheDocument();
  expect(screen.getAllByText("$500")).toHaveLength(2); // 1 in row, 1 in net balance
  expect(screen.getByText("Net balance")).toBeInTheDocument();
});
