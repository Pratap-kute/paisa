<script lang="ts">
import { setColorPreference } from "$lib/shared/browser/theme";
import Dialog from "$lib/shared/ui/Dialog.svelte";
import { goto } from "$app/navigation";
import { onMount } from "svelte";
import { getColorPreference } from "$lib/shared/browser/theme";
import { accountTfIdf, theme as themeStore } from "$lib/shared/state/store";
import Badge from "$lib/shared/ui/Badge.svelte";

interface Props {
  open?: boolean;
}

let { open = $bindable(false) }: Props = $props();

let query = $state("");
let selectedIndex = $state(0);
let isMac = $state(false);

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: "Navigation" | "Actions" | "Accounts" | "Search";
  keywords?: string[];
  action: () => void;
}

function toggleTheme() {
  const current = getColorPreference();
  const next = current === "light" ? "dark" : "light";
  setColorPreference(next);
  if (typeof document !== "undefined") {
    document.firstElementChild?.setAttribute("data-theme", next);
  }
  themeStore.set(next);
}

function navigate(href: string) {
  open = false;
  goto(href);
}

const staticCommands: CommandItem[] = [
  // Overview
  {
    id: "nav-dashboard",
    title: "Dashboard",
    description: "Financial overview and key metrics",
    icon: "fa-solid fa-gauge-high",
    category: "Navigation",
    keywords: ["home", "overview", "summary", "stats"],
    action: () => navigate("/"),
  },
  {
    id: "nav-insights",
    title: "Financial Insights",
    description: "Important changes, anomalies, and risks",
    icon: "fa-solid fa-lightbulb",
    category: "Navigation",
    keywords: ["insights", "health", "risks", "trends", "observations"],
    action: () => navigate("/insights"),
  },
  // Cash Flow
  {
    id: "nav-cashflow-monthly",
    title: "Monthly Cash Flow",
    description: "Income and expense flow by month",
    icon: "fa-solid fa-calendar-days",
    category: "Navigation",
    keywords: ["cash", "flow", "income", "monthly"],
    action: () => navigate("/cash_flow/monthly"),
  },
  {
    id: "nav-cashflow-yearly",
    title: "Yearly Cash Flow",
    description: "Annual multi-year cash flow comparison",
    icon: "fa-solid fa-calendar",
    category: "Navigation",
    keywords: ["cash", "flow", "annual", "yearly"],
    action: () => navigate("/cash_flow/yearly"),
  },
  {
    id: "nav-income-statement",
    title: "Income Statement",
    description: "Profit & loss breakdown",
    icon: "fa-solid fa-file-invoice-dollar",
    category: "Navigation",
    keywords: ["pnl", "profit", "loss", "income", "statement"],
    action: () => navigate("/cash_flow/income_statement"),
  },
  {
    id: "nav-cashflow-recurring",
    title: "Recurring Transactions",
    description: "Subscriptions and periodic cash flows",
    icon: "fa-solid fa-arrows-rotate",
    category: "Navigation",
    keywords: ["recurring", "subscriptions", "periodic", "bills"],
    action: () => navigate("/cash_flow/recurring"),
  },
  // Expenses
  {
    id: "nav-expense-monthly",
    title: "Monthly Expenses",
    description: "Detailed monthly expense breakdown and heatmap",
    icon: "fa-solid fa-chart-pie",
    category: "Navigation",
    keywords: ["expense", "spending", "monthly", "categories"],
    action: () => navigate("/expense/monthly"),
  },
  {
    id: "nav-expense-yearly",
    title: "Yearly Expenses",
    description: "Annual expense trends and totals",
    icon: "fa-solid fa-chart-column",
    category: "Navigation",
    keywords: ["expense", "spending", "yearly", "annual"],
    action: () => navigate("/expense/yearly"),
  },
  {
    id: "nav-expense-budget",
    title: "Budget",
    description: "Category spending budgets and progress",
    icon: "fa-solid fa-bullseye",
    category: "Navigation",
    keywords: ["budget", "target", "allowance", "spending limit"],
    action: () => navigate("/expense/budget"),
  },
  // Assets & Investments
  {
    id: "nav-asset-investment",
    title: "Investment Portfolio",
    description: "Mutual funds, stocks, EPF, NPS and commodity holdings",
    icon: "fa-solid fa-chart-line",
    category: "Navigation",
    keywords: [
      "stocks",
      "funds",
      "portfolio",
      "assets",
      "investments",
      "holdings",
    ],
    action: () => navigate("/assets/investment"),
  },
  {
    id: "nav-asset-networth",
    title: "Net Worth",
    description: "Historical asset and liability balance progression",
    icon: "fa-solid fa-landmark",
    category: "Navigation",
    keywords: ["net worth", "assets", "wealth", "growth"],
    action: () => navigate("/assets/networth"),
  },
  {
    id: "nav-asset-analysis",
    title: "Asset Analysis",
    description: "Asset allocation, diversification, and breakdown",
    icon: "fa-solid fa-chart-simple",
    category: "Navigation",
    keywords: ["asset", "allocation", "diversification", "analysis"],
    action: () => navigate("/assets/analysis"),
  },
  {
    id: "nav-asset-gain",
    title: "Capital Gains & Losses",
    description: "Realized and unrealized investment returns",
    icon: "fa-solid fa-arrow-trend-up",
    category: "Navigation",
    keywords: ["gains", "losses", "returns", "xirr", "cagr", "performance"],
    action: () => navigate("/assets/gain"),
  },
  // Liabilities
  {
    id: "nav-liabilities-cards",
    title: "Credit Cards",
    description: "Card balances, credit limits, and billing cycles",
    icon: "fa-solid fa-credit-card",
    category: "Navigation",
    keywords: ["credit", "cards", "limits", "liabilities"],
    action: () => navigate("/liabilities/credit_cards"),
  },
  {
    id: "nav-liabilities-interest",
    title: "Interest & Loans",
    description: "Loan repayments and interest amortization",
    icon: "fa-solid fa-percent",
    category: "Navigation",
    keywords: ["loans", "interest", "debt", "mortgage"],
    action: () => navigate("/liabilities/interest"),
  },
  // Ledger
  {
    id: "nav-ledger-transactions",
    title: "Ledger Transactions",
    description: "Search and inspect all ledger transactions",
    icon: "fa-solid fa-receipt",
    category: "Navigation",
    keywords: ["transactions", "tx", "search", "journal", "entries"],
    action: () => navigate("/ledger/transaction"),
  },
  {
    id: "nav-ledger-postings",
    title: "Ledger Postings",
    description: "Search and filter granular posting splits",
    icon: "fa-solid fa-table-list",
    category: "Navigation",
    keywords: ["postings", "splits", "legs", "ledger search"],
    action: () => navigate("/ledger/posting"),
  },
  {
    id: "nav-ledger-editor",
    title: "Ledger File Editor",
    description: "Edit, format, and validate hledger files in CodeMirror",
    icon: "fa-solid fa-code",
    category: "Navigation",
    keywords: ["editor", "code", "hledger", "journal", "files", "syntax"],
    action: () => navigate("/ledger/editor/default"),
  },
  {
    id: "nav-ledger-import",
    title: "Import Bank Statements",
    description: "Parse CSV, PDF, and spreadsheet transactions",
    icon: "fa-solid fa-file-import",
    category: "Navigation",
    keywords: ["import", "csv", "pdf", "bank statement", "excel", "template"],
    action: () => navigate("/ledger/import"),
  },
  {
    id: "nav-ledger-prices",
    title: "Price Database",
    description: "Historical commodity, currency, and stock prices",
    icon: "fa-solid fa-tags",
    category: "Navigation",
    keywords: ["prices", "rates", "forex", "nav", "commodities"],
    action: () => navigate("/ledger/price"),
  },
  // Planning & Tools
  {
    id: "nav-goals",
    title: "Financial Goals",
    description: "Retirement, savings, and milestone planning",
    icon: "fa-solid fa-flag-checkered",
    category: "Navigation",
    keywords: ["goals", "retirement", "fire", "savings", "planning"],
    action: () => navigate("/more/goals"),
  },
  {
    id: "nav-tax-harvest",
    title: "Tax Loss & Gain Harvesting",
    description: "Optimize capital gains taxes before fiscal year end",
    icon: "fa-solid fa-calculator",
    category: "Navigation",
    keywords: ["tax", "harvest", "ltcg", "stcg", "exemptions"],
    action: () => navigate("/more/tax/harvest"),
  },
  {
    id: "nav-sheets",
    title: "Paisa Sheets",
    description: "Interactive financial scratchpads and spreadsheets",
    icon: "fa-solid fa-file-excel",
    category: "Navigation",
    keywords: ["sheets", "calc", "spreadsheet", "scratchpad"],
    action: () => navigate("/more/sheets/default"),
  },
  {
    id: "nav-doctor",
    title: "System Diagnosis & Health",
    description: "Validate hledger configuration and backend diagnostics",
    icon: "fa-solid fa-stethoscope",
    category: "Navigation",
    keywords: ["doctor", "diagnosis", "health", "system", "hledger check"],
    action: () => navigate("/more/doctor"),
  },
  {
    id: "nav-config",
    title: "Settings & Configuration",
    description: "Customize currencies, fiscal years, and preferences",
    icon: "fa-solid fa-gear",
    category: "Navigation",
    keywords: ["settings", "config", "preferences", "options"],
    action: () => navigate("/more/config"),
  },
  // Quick Actions
  {
    id: "action-toggle-theme",
    title: "Toggle Theme",
    description: "Switch between dark mode and light mode",
    icon: "fa-solid fa-circle-half-stroke",
    category: "Actions",
    keywords: ["dark", "light", "theme", "mode", "color"],
    action: () => {
      toggleTheme();
      open = false;
    },
  },
  {
    id: "action-new-file",
    title: "New Ledger File",
    description: "Create a new journal file in the editor",
    icon: "fa-solid fa-file-circle-plus",
    category: "Actions",
    keywords: ["create", "new", "file", "journal", "add"],
    action: () => navigate("/ledger/editor/default"),
  },
  {
    id: "action-import",
    title: "Import Bank Statement",
    description: "Upload and map a financial statement",
    icon: "fa-solid fa-cloud-arrow-up",
    category: "Actions",
    keywords: ["import", "upload", "statement", "csv"],
    action: () => navigate("/ledger/import"),
  },
];

const filteredCommands = $derived.by(() => {
  const trimmed = query.trim().toLowerCase();

  // Accounts search results when query matches
  const accountItems: CommandItem[] = [];
  if (trimmed && $accountTfIdf?.tf_idf) {
    const matchedAccounts = Object.keys($accountTfIdf.tf_idf)
      .filter((acc) => acc.toLowerCase().includes(trimmed))
      .slice(0, 5);

    for (const acc of matchedAccounts) {
      accountItems.push({
        id: `account-${acc}`,
        title: acc,
        description: "Search transactions for this account",
        icon: "fa-solid fa-folder-tree",
        category: "Accounts",
        action: () =>
          navigate(`/ledger/transaction?query=${encodeURIComponent(acc)}`),
      });
    }
  }

  if (!trimmed) {
    return staticCommands;
  }

  const matches = staticCommands.filter((cmd) => {
    const matchTitle = cmd.title.toLowerCase().includes(trimmed);
    const matchDesc = cmd.description?.toLowerCase().includes(trimmed);
    const matchKeywords = cmd.keywords?.some((k) =>
      k.toLowerCase().includes(trimmed)
    );
    return matchTitle || matchDesc || matchKeywords;
  });

  const searchActionItem: CommandItem = {
    id: "query-search",
    title: `Search transactions for "${query.trim()}"`,
    description: "Jump to transaction search with this query",
    icon: "fa-solid fa-magnifying-glass",
    category: "Search",
    action: () =>
      navigate(`/ledger/transaction?query=${encodeURIComponent(query.trim())}`),
  };

  return [...matches, ...accountItems, searchActionItem];
});

const groupedCommands = $derived.by(() => {
  const groups: { category: string; items: CommandItem[] }[] = [];
  const map = new Map<string, CommandItem[]>();

  for (const item of filteredCommands) {
    if (!map.has(item.category)) {
      map.set(item.category, []);
    }
    map.get(item.category)!.push(item);
  }

  for (const [category, items] of map) {
    groups.push({ category, items });
  }
  return groups;
});

function handleKeyDown(e: KeyboardEvent) {
  if (!open) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % filteredCommands.length;
    scrollToActive();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + filteredCommands.length) %
      filteredCommands.length;
    scrollToActive();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
    }
  }
}

function scrollToActive() {
  setTimeout(() => {
    const activeEl = document.querySelector('[data-command-active="true"]');
    activeEl?.scrollIntoView({ block: "nearest" });
  }, 10);
}

$effect(() => {
  if (open) {
    query = "";
    selectedIndex = 0;
    setTimeout(() => {
      const input = document.getElementById("paisa-command-palette-input");
      input?.focus();
    }, 50);
  }
});

onMount(() => {
  isMac = typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);

  function onGlobalKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const isInput = Boolean(target) &&
      typeof target?.closest === "function" &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        Boolean(target.isContentEditable) ||
        Boolean(target.closest(".cm-content")));

    // ⌘K or Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === "k") {
      e.preventDefault();
      open = !open;
      return;
    }

    // / when not in editable inputs
    if (e.key === "/" && !isInput && !open) {
      e.preventDefault();
      open = true;
      return;
    }
  }

  window.addEventListener("keydown", onGlobalKeydown);
  return () => {
    window.removeEventListener("keydown", onGlobalKeydown);
  };
});
</script>

<svelte:window onkeydown={handleKeyDown} />

<Dialog
  bind:open
  title="Command Palette"
  showHeader={false}
  unstyled
  overlayClass="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-150"
  contentClass="fixed left-1/2 top-[12%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] shadow-2xl transition-all duration-150 max-sm:top-4 max-sm:w-[94%]"
>
  {#snippet children()}
      <!-- SEARCH INPUT HEADER -->
      <div
        class="flex items-center gap-3 border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] px-4 py-3">
        <i class="fa-solid fa-magnifying-glass text-sm text-[var(--paisa-muted-foreground)]"></i>
        <input
          id="paisa-command-palette-input"
          type="text"
          bind:value={query}
          placeholder="Search pages, accounts, or type a command..."
          class="flex-1 border-0 bg-transparent text-sm text-[var(--paisa-foreground)] placeholder-[var(--paisa-muted-foreground)] outline-none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        />
        {#if query}
          <button
            type="button"
            class="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-[var(--paisa-muted-foreground)] hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-foreground)]"
            onclick={() => (query = "")}
            aria-label="Clear search"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        {/if}
        <kbd class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--paisa-muted-foreground)]">
          ESC
        </kbd>
      </div>

      <!-- RESULTS LIST -->
      <div class="max-h-[60vh] overflow-y-auto p-2">
        {#if filteredCommands.length === 0}
          <div class="flex flex-col items-center justify-center py-10 text-center">
            <div class="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--paisa-surface-hover)] text-[var(--paisa-muted-foreground)]">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <p class="text-sm font-medium text-[var(--paisa-foreground)]">No results found</p>
            <p class="text-xs text-[var(--paisa-muted-foreground)]">No commands or pages matching "{query}"</p>
          </div>
        {:else}
          {#each groupedCommands as group}
            <div class="mb-2">
              <span class="px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--paisa-muted-foreground)]">
                {group.category}
              </span>
              <div class="mt-1 flex flex-col gap-0.5">
                {#each group.items as item}
                  {@const index = filteredCommands.indexOf(item)}
                  {@const active = index === selectedIndex}
                  <button
                    type="button"
                    data-command-active={active}
                    class="group flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors {active ? 'bg-[var(--paisa-primary)] text-white' : 'text-[var(--paisa-foreground)] hover:bg-[var(--paisa-surface-hover)]'}"
                    onclick={() => item.action()}
                    onmouseenter={() => (selectedIndex = index)}
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md {active ? 'bg-white/20 text-white' : 'bg-[var(--paisa-surface-raised)] text-[var(--paisa-primary)]'}">
                        <i class="{item.icon} text-xs"></i>
                      </div>
                      <div class="min-w-0">
                        <div class="truncate text-xs font-semibold">{item.title}</div>
                        {#if item.description}
                          <div class="truncate text-[0.6875rem] {active ? 'text-white/80' : 'text-[var(--paisa-muted-foreground)]'}">
                            {item.description}
                          </div>
                        {/if}
                      </div>
                    </div>
                    {#if active}
                      <kbd class="ml-2 rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.625rem] text-white">
                        ↵
                      </kbd>
                    {/if}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- FOOTER -->
      <div
        class="flex items-center justify-between border-t border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] px-4 py-2 text-[0.6875rem] text-[var(--paisa-muted-foreground)]">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <kbd
              class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1 font-mono">↑</kbd>
            <kbd
              class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1 font-mono">↓</kbd>
            <span>Navigate</span>
          </span>
          <span class="flex items-center gap-1">
            <kbd
              class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1 font-mono">↵</kbd>
            <span>Select</span>
          </span>
        </div>
        <div class="flex items-center gap-1">
          <span>Shortcuts:</span>
          <kbd
            class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1 font-mono">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
          <span>or</span>
          <kbd
            class="rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-1 font-mono">/</kbd>
        </div>
      </div>
  {/snippet}
</Dialog>
