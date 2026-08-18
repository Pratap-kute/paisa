export type VisualRoute = {
  name: string;
  path: string;
  ready?: string;
  readyText?: string;
};

export const visualRoutes: VisualRoute[] = [
  { name: "dashboard", path: "/", readyText: "Net worth" },
  { name: "assets-allocation", path: "/assets/allocation" },
  {
    name: "assets-analysis",
    path: "/assets/analysis",
    ready: "#d3-portfolio-security-type > g",
  },
  { name: "assets-balance", path: "/assets/balance" },
  { name: "assets-gain", path: "/assets/gain" },
  { name: "assets-gain-detail", path: "/assets/gain/Assets%3AEquity" },
  { name: "assets-investment", path: "/assets/investment" },
  { name: "networth", path: "/assets/networth", readyText: "Net worth" },
  { name: "cash-flow-income-statement", path: "/cash_flow/income_statement" },
  { name: "cash-flow-monthly", path: "/cash_flow/monthly" },
  {
    name: "cash-flow-recurring",
    path: "/cash_flow/recurring",
    ready: ".paisa-recurring-cards-list",
  },
  { name: "cash-flow-yearly", path: "/cash_flow/yearly" },
  { name: "expense-budget", path: "/expense/budget", ready: ".budget-card" },
  { name: "expense-monthly", path: "/expense/monthly" },
  { name: "expense-yearly", path: "/expense/yearly", ready: "#d3-yearly-expense-timeline g" },
  { name: "income", path: "/income" },
  { name: "ledger-editor", path: "/ledger/editor" },
  { name: "ledger-editor-file", path: "/ledger/editor/main.ledger" },
  { name: "ledger-import", path: "/ledger/import" },
  { name: "ledger-posting", path: "/ledger/posting" },
  { name: "ledger-price", path: "/ledger/price" },
  { name: "transactions", path: "/ledger/transaction", ready: "p.is-6" },
  {
    name: "liabilities-balance",
    path: "/liabilities/balance",
    readyText: "HomeLoan",
  },
  {
    name: "credit-cards",
    path: "/liabilities/credit_cards",
    readyText: "Freedom",
  },
  {
    name: "credit-card-detail",
    path: "/liabilities/credit_cards/Liabilities%3ACreditCard%3AFreedom",
  },
  { name: "liabilities-interest", path: "/liabilities/interest" },
  { name: "liabilities-repayment", path: "/liabilities/repayment" },
  { name: "about", path: "/more/about" },
  { name: "config", path: "/more/config" },
  { name: "doctor", path: "/more/doctor" },
  { name: "goals", path: "/more/goals", readyText: "Retirement" },
  { name: "retirement-goal", path: "/more/goals/retirement/Retirement" },
  { name: "savings-goal", path: "/more/goals/savings/House" },
  {
    name: "logs",
    path: "/more/logs",
    readyText: "paisa server started on port 7500",
  },
  { name: "sheets", path: "/more/sheets" },
  { name: "sheet-detail", path: "/more/sheets/overview.paisa" },
  { name: "tax-capital-gains", path: "/more/tax/capital_gains" },
  { name: "tax-harvest", path: "/more/tax/harvest" },
  { name: "tax-schedule-al", path: "/more/tax/schedule_al" },
  { name: "login", path: "/login" },
];

export const overflowRoutes = [
  { name: "ledger-posting", path: "/ledger/posting" },
  { name: "ledger-price", path: "/ledger/price" },
  { name: "transactions", path: "/ledger/transaction" },
  { name: "expense-monthly", path: "/expense/monthly" },
  { name: "expense-yearly", path: "/expense/yearly" },
  { name: "assets-allocation", path: "/assets/allocation" },
  { name: "assets-analysis", path: "/assets/analysis" },
  { name: "config", path: "/more/config" },
  { name: "sheet-detail", path: "/more/sheets/overview.paisa" },
  { name: "cash-flow-recurring", path: "/cash_flow/recurring" },
] as const;

export const chartSnapshots = [
  {
    name: "networth",
    path: "/assets/networth",
    locator: "#d3-networth-timeline",
    readyText: "Net worth",
  },
  {
    name: "cash-flow-monthly",
    path: "/cash_flow/monthly",
    locator: "#d3-monthly-cash-flow",
  },
  {
    name: "assets-analysis",
    path: "/assets/analysis",
    locator: "#d3-portfolio-security-type",
  },
  {
    name: "assets-allocation",
    path: "/assets/allocation",
    locator: "#d3-allocation-category",
  },
  {
    name: "expense-monthly",
    path: "/expense/monthly",
    locator: "#d3-current-month-breakdown",
  },
] as const;

export const chartSnapshotVariants = [
  { name: "desktop-light", width: 1440, height: 900, theme: "light" as const },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark" as const },
];
