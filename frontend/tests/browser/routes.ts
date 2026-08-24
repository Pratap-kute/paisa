export type VisualRoute = {
  name: string;
  path: string;
  ready?: string;
  readyText?: string;
};

export const visualRoutes: VisualRoute[] = [
  {
    name: "dashboard",
    path: "/",
    ready:
      "[data-testid='dashboard-cash-flow-echart'][data-chart-ready='true']",
  },
  {
    name: "assets-allocation",
    path: "/assets/allocation",
    ready:
      "[data-testid='allocation-timeline-echart'][data-chart-ready='true']",
  },
  {
    name: "assets-analysis",
    path: "/assets/analysis",
    ready:
      "[data-testid='portfolio-security-type-echart'][data-chart-ready='true']",
  },
  { name: "assets-balance", path: "/assets/balance" },
  {
    name: "assets-gain",
    path: "/assets/gain",
    ready:
      "[data-testid='asset-gain-overview-echart'][data-chart-ready='true']",
  },
  {
    name: "assets-gain-detail",
    path: "/assets/gain/Assets%3AEquity",
    ready:
      "[data-testid='gain-account-timeline-echart'][data-chart-ready='true']",
  },
  {
    name: "assets-investment",
    path: "/assets/investment",
    ready: "[data-testid='investment-monthly-echart'][data-chart-ready='true']",
  },
  {
    name: "networth",
    path: "/assets/networth",
    ready: "[data-testid='networth-timeline-echart'][data-chart-ready='true']",
  },
  {
    name: "cash-flow-income-statement",
    path: "/cash_flow/income_statement",
    ready:
      "[data-testid='income-statement-waterfall-echart'][data-chart-ready='true']",
  },
  {
    name: "cash-flow-monthly",
    path: "/cash_flow/monthly",
    ready: "[data-testid='monthly-cash-flow-echart'][data-chart-ready='true']",
  },
  {
    name: "cash-flow-recurring",
    path: "/cash_flow/recurring",
    readyText: "Recurring Transactions",
  },
  {
    name: "cash-flow-yearly",
    path: "/cash_flow/yearly",
    ready:
      "[data-testid='cash-flow-yearly-treemap-echart'][data-chart-ready='true']",
  },
  { name: "expense-budget", path: "/expense/budget", readyText: "All Budgets" },
  {
    name: "expense-monthly",
    path: "/expense/monthly",
    ready:
      "[data-testid='monthly-expense-timeline-echart'][data-chart-ready='true']",
  },
  {
    name: "expense-yearly",
    path: "/expense/yearly",
    ready:
      "[data-testid='yearly-expense-timeline-echart'][data-chart-ready='true']",
  },
  {
    name: "income",
    path: "/income",
    ready: "[data-testid='income-monthly-echart'][data-chart-ready='true']",
  },
  { name: "ledger-editor", path: "/ledger/editor" },
  { name: "ledger-editor-file", path: "/ledger/editor/main.ledger" },
  { name: "ledger-import", path: "/ledger/import" },
  { name: "ledger-posting", path: "/ledger/posting" },
  {
    name: "ledger-price",
    path: "/ledger/price",
    readyText: "Commodity Prices",
  },
  {
    name: "transactions",
    path: "/ledger/transaction",
    readyText: "Journal transactions, search, and bulk edits",
  },
  {
    name: "liabilities-balance",
    path: "/liabilities/balance",
    ready: "main h1:has-text('Liabilities Balance')",
  },
  {
    name: "credit-cards",
    path: "/liabilities/credit_cards",
    ready: "main h1:has-text('Credit Cards')",
  },
  {
    name: "credit-card-detail",
    path: "/liabilities/credit_cards/Liabilities%3ACreditCard%3AFreedom",
    ready:
      "[data-testid='credit-card-yearly-spends-echart'][data-chart-ready='true']",
  },
  {
    name: "liabilities-interest",
    path: "/liabilities/interest",
    ready: "[data-testid='interest-overview-echart'][data-chart-ready='true']",
  },
  {
    name: "liabilities-repayment",
    path: "/liabilities/repayment",
    ready: "[data-testid='repayment-timeline-echart'][data-chart-ready='true']",
  },
  { name: "about", path: "/more/about" },
  { name: "config", path: "/more/config" },
  { name: "doctor", path: "/more/doctor" },
  { name: "goals", path: "/more/goals", readyText: "Retirement" },
  {
    name: "retirement-goal",
    path: "/more/goals/retirement/Retirement",
    ready:
      "[data-testid='retirement-goal-progress-echart'][data-chart-ready='true']",
  },
  {
    name: "savings-goal",
    path: "/more/goals/savings/House",
    ready:
      "[data-testid='savings-goal-progress-echart'][data-chart-ready='true']",
  },
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
    locator: "[data-testid='networth-timeline-echart']",
  },
  {
    name: "cash-flow-monthly",
    path: "/cash_flow/monthly",
    locator: "[data-testid='monthly-cash-flow-echart']",
  },
  {
    name: "assets-analysis",
    path: "/assets/analysis",
    locator: "[data-testid='portfolio-security-type-echart']",
  },
  {
    name: "assets-allocation",
    path: "/assets/allocation",
    locator: "[data-testid='allocation-category-echart']",
  },
  {
    name: "expense-monthly",
    path: "/expense/monthly",
    locator: "[data-testid='monthly-expense-breakdown-echart']",
  },
  {
    name: "expense-yearly-calendar",
    path: "/expense/yearly",
    locator: "[data-testid='yearly-expense-calendar']",
  },
  {
    name: "portfolio-hierarchy",
    path: "/assets/analysis",
    locator: "[data-testid='portfolio-industry-echart']",
  },
  {
    name: "allocation-timeline",
    path: "/assets/allocation",
    locator: "[data-testid='allocation-timeline-echart']",
  },
  {
    name: "liability-interest",
    path: "/liabilities/interest",
    locator: "[data-testid='interest-overview-echart']",
  },
  {
    name: "income-statement",
    path: "/cash_flow/income_statement",
    locator: "[data-testid='income-statement-waterfall-echart']",
  },
  {
    name: "cash-flow-yearly",
    path: "/cash_flow/yearly",
    locator: "[data-testid='cash-flow-yearly-treemap-echart']",
    selectOption: "2021 - 22",
  },
  {
    name: "savings-goal",
    path: "/more/goals/savings/House",
    locator: "[data-testid='savings-goal-progress-echart']",
  },
] as const;

export const chartSnapshotVariants = [
  { name: "desktop-light", width: 1440, height: 900, theme: "light" as const },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark" as const },
];
