<script lang="ts">
  import { page } from "$app/stores";
  import { afterNavigate } from "$app/navigation";
  import type { Snippet } from "svelte";
  import Logo from "./Logo.svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import Actions from "./Actions.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Spinner from "$lib/components/ui/Spinner.svelte";
  import {
    financialYear,
    forEachFinancialYear,
  } from "$lib/core/utils";
  import {
    month,
    year,
    dateMax,
    dateMin,
    dateRangeOption,
  } from "../../../store";
  import {
    cashflowExpenseDepth,
    cashflowExpenseDepthAllowed,
    cashflowIncomeDepth,
    cashflowIncomeDepthAllowed,
  } from "../../../persisted_store";
  import DateRange from "$lib/components/ui/DateRange.svelte";
  import MonthPicker from "$lib/components/ui/MonthPicker.svelte";
  import InputRange from "$lib/components/ui/InputRange.svelte";

  interface Props {
    isBurger?: boolean | null;
    children?: Snippet;
  }

  let { isBurger = $bindable(false), children }: Props = $props();

  let mobileDrawerOpen = $state(false);

  afterNavigate(() => {
    mobileDrawerOpen = false;
  });

  $effect(() => {
    if (typeof document !== "undefined") {
      if (mobileDrawerOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  });

  const readonly = typeof USER_CONFIG !== "undefined" && USER_CONFIG.readonly;
  const isINR = typeof USER_CONFIG !== "undefined" && USER_CONFIG.default_currency === "INR";

  interface NavItem {
    label: string;
    href: string;
    icon?: string;
    subItems?: { label: string; href: string }[];
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/", icon: "fa-solid fa-gauge-high" },
      ],
    },
    {
      title: "Money",
      items: [
        {
          label: "Cash Flow",
          href: "/cash_flow/monthly",
          icon: "fa-solid fa-arrow-trend-up",
          subItems: [
            { label: "Monthly", href: "/cash_flow/monthly" },
            { label: "Income Statement", href: "/cash_flow/income_statement" },
            { label: "Yearly", href: "/cash_flow/yearly" },
            { label: "Recurring", href: "/cash_flow/recurring" },
          ],
        },
        { label: "Income", href: "/income", icon: "fa-solid fa-money-bill-wave" },
        {
          label: "Expenses",
          href: "/expense/monthly",
          icon: "fa-solid fa-credit-card",
          subItems: [
            { label: "Monthly", href: "/expense/monthly" },
            { label: "Yearly", href: "/expense/yearly" },
            { label: "Budget", href: "/expense/budget" },
          ],
        },
      ],
    },
    {
      title: "Wealth",
      items: [
        {
          label: "Assets",
          href: "/assets/balance",
          icon: "fa-solid fa-wallet",
          subItems: [
            { label: "Balance", href: "/assets/balance" },
            { label: "Net Worth", href: "/assets/networth" },
            { label: "Investment", href: "/assets/investment" },
            { label: "Gain", href: "/assets/gain" },
            { label: "Allocation", href: "/assets/allocation" },
            { label: "Analysis", href: "/assets/analysis" },
          ],
        },
        {
          label: "Liabilities",
          href: "/liabilities/balance",
          icon: "fa-solid fa-building-columns",
          subItems: [
            { label: "Balance", href: "/liabilities/balance" },
            { label: "Credit Cards", href: "/liabilities/credit_cards" },
            { label: "Repayment", href: "/liabilities/repayment" },
            { label: "Interest", href: "/liabilities/interest" },
          ],
        },
        { label: "Goals", href: "/more/goals", icon: "fa-solid fa-bullseye" },
      ],
    },
    {
      title: "Ledger",
      items: [
        { label: "Transactions", href: "/ledger/transaction", icon: "fa-solid fa-list-check" },
        { label: "Postings", href: "/ledger/posting", icon: "fa-solid fa-table-list" },
        { label: "Prices", href: "/ledger/price", icon: "fa-solid fa-chart-line" },
        { label: "Import", href: "/ledger/import", icon: "fa-solid fa-file-import" },
        { label: "Editor", href: "/ledger/editor", icon: "fa-solid fa-pen-to-square" },
      ],
    },
    ...(isINR
      ? [
          {
            title: "Tax",
            items: [
              {
                label: "Tax Center",
                href: "/more/tax/capital_gains",
                icon: "fa-solid fa-receipt",
                subItems: [
                  { label: "Capital Gains", href: "/more/tax/capital_gains" },
                  { label: "Tax Harvest", href: "/more/tax/harvest" },
                  { label: "Schedule AL", href: "/more/tax/schedule_al" },
                ],
              },
            ],
          },
        ]
      : []),
    {
      title: "Tools",
      items: [
        { label: "Sheets", href: "/more/sheets", icon: "fa-solid fa-table" },
      ],
    },
  ];

  const systemItems = [
    { label: "Settings", href: "/more/config", icon: "fa-solid fa-gear" },
    { label: "System", href: "/more/doctor", icon: "fa-solid fa-stethoscope" },
    { label: "Logs", href: "/more/logs", icon: "fa-solid fa-terminal" },
    { label: "About", href: "/more/about", icon: "fa-solid fa-circle-info" },
  ];

  function isPathActive(targetHref: string, currentPath: string): boolean {
    if (targetHref === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(targetHref);
  }

  let pathname = $derived($page.url.pathname);
  let showDateRange = $derived(
    pathname === "/cash_flow/monthly" ||
    pathname === "/expense/monthly" ||
    pathname === "/assets/networth"
  );
  let showMonthPicker = $derived(
    pathname === "/cash_flow/recurring" ||
    pathname === "/expense/monthly" ||
    pathname === "/expense/budget"
  );
  let showFinancialYearPicker = $derived(
    pathname === "/cash_flow/income_statement" ||
    pathname === "/cash_flow/yearly" ||
    pathname === "/expense/yearly" ||
    pathname === "/more/tax/schedule_al"
  );
  let showYearlyDepth = $derived(pathname === "/cash_flow/yearly");
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && mobileDrawerOpen && (mobileDrawerOpen = false)} />

<div class="paisa-app-layout">
  <!-- Desktop Sidebar -->
  <aside class="paisa-sidebar">
    <!-- Brand / Logo Header -->
    <div class="paisa-sidebar-brand">
      <div class="paisa-brand-icon">
        <Logo size={20} />
      </div>
      <span class="paisa-brand-text">Paisa</span>
    </div>

    <!-- Navigation Scroll Container -->
    <nav class="paisa-sidebar-nav" aria-label="main navigation">
      {#each navSections as section}
        <div class="paisa-nav-section">
          <div class="paisa-nav-heading">
            {section.title}
          </div>
          {#each section.items as item}
            {@const active = isPathActive(item.href, pathname)}
            <a
              href={item.href}
              class="paisa-nav-link {active ? 'is-active' : ''}"
            >
              {#if item.icon}
                <i class="{item.icon} paisa-nav-icon {active ? 'is-active' : ''}"></i>
              {/if}
              <span class="paisa-nav-label">{item.label}</span>
            </a>
            {#if item.subItems && (active || item.subItems.some(sub => isPathActive(sub.href, pathname)))}
              <div class="paisa-nav-subitems">
                {#each item.subItems as sub}
                  {@const subActive = pathname === sub.href}
                  <a
                    href={sub.href}
                    class="paisa-nav-sublink {subActive ? 'is-active' : ''}"
                  >
                    {sub.label}
                  </a>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </nav>

    <!-- Bottom System Navigation -->
    <div class="paisa-sidebar-footer">
      {#each systemItems as item}
        {@const active = isPathActive(item.href, pathname)}
        <a
          href={item.href}
          class="paisa-footer-link {active ? 'is-active' : ''}"
        >
          <i class="{item.icon} paisa-footer-icon"></i>
          <span>{item.label}</span>
        </a>
      {/each}
    </div>
  </aside>

  <!-- Mobile Drawer Backdrop & Menu -->
  {#if mobileDrawerOpen}
    <div
      class="paisa-mobile-backdrop"
      onclick={() => (mobileDrawerOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (mobileDrawerOpen = false)}
      tabindex="-1"
      role="button"
      aria-label="Close navigation overlay"
    ></div>
    <div
      class="paisa-mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation drawer"
    >
      <div class="paisa-drawer-header">
        <div class="paisa-drawer-brand">
          <div class="paisa-brand-icon">
            <Logo size={20} />
          </div>
          <span class="paisa-brand-text">Paisa</span>
        </div>
        <button
          type="button"
          onclick={() => (mobileDrawerOpen = false)}
          class="paisa-drawer-close"
          aria-label="Close navigation menu"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <nav class="paisa-sidebar-nav" aria-label="drawer navigation">
        {#each navSections as section}
          <div class="paisa-nav-section">
            <div class="paisa-nav-heading">
              {section.title}
            </div>
            {#each section.items as item}
              {@const active = isPathActive(item.href, pathname)}
              <a
                href={item.href}
                class="paisa-nav-link {active ? 'is-active' : ''}"
                onclick={() => (mobileDrawerOpen = false)}
              >
                {#if item.icon}
                  <i class="{item.icon} paisa-nav-icon {active ? 'is-active' : ''}"></i>
                {/if}
                <span class="paisa-nav-label">{item.label}</span>
              </a>
              {#if item.subItems}
                <div class="paisa-nav-subitems">
                  {#each item.subItems as sub}
                    {@const subActive = pathname === sub.href}
                    <a
                      href={sub.href}
                      class="paisa-nav-sublink {subActive ? 'is-active' : ''}"
                      onclick={() => (mobileDrawerOpen = false)}
                    >
                      {sub.label}
                    </a>
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        {/each}
      </nav>

      <div class="paisa-sidebar-footer">
        {#each systemItems as item}
          <a
            href={item.href}
            class="paisa-footer-link"
            onclick={() => (mobileDrawerOpen = false)}
          >
            <i class="{item.icon} paisa-footer-icon"></i>
            <span>{item.label}</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Top Utility Header Bar -->
  <header class="paisa-top-header">
    <!-- Left Section: Mobile Nav + Brand (< 1024px) OR Desktop Search (>= 1024px) -->
    <div class="paisa-header-left">
      <!-- Mobile Nav Trigger & Brand -->
      <nav class="paisa-mobile-nav-bar" aria-label="main navigation">
        <button
          type="button"
          onclick={() => (mobileDrawerOpen = true)}
          class="paisa-burger-btn"
          aria-label="Open navigation menu"
        >
          <i class="fa-solid fa-bars"></i>
        </button>

        <div class="paisa-mobile-brand">
          <div class="paisa-brand-icon">
            <Logo size={20} />
          </div>
          <span class="paisa-brand-text">Paisa</span>
        </div>
      </nav>

      <!-- Desktop Search Command Bar -->
      <div class="paisa-search-trigger">
        <i class="fa-solid fa-magnifying-glass text-[11px]"></i>
        <span class="paisa-search-text">Search Paisa or commands...</span>
        <kbd class="paisa-search-kbd">⌘K</kbd>
      </div>
    </div>

    <!-- Right Section: Filters (Desktop only) + Readonly + Theme + Actions -->
    <div class="paisa-header-right">
      {#if showDateRange}
        <div class="hidden sm:block">
          <DateRange
            bind:value={$dateRangeOption}
            dateMin={$dateMin}
            dateMax={$dateMax}
          />
        </div>
      {/if}
      {#if showMonthPicker}
        <div class="hidden sm:block">
          <MonthPicker bind:value={$month} max={$dateMax} min={$dateMin} />
        </div>
      {/if}
      {#if showFinancialYearPicker}
        <div class="hidden sm:block">
          <select
            bind:value={$year}
            class="px-2 py-1 text-xs rounded border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] text-[var(--paisa-foreground)]"
          >
            {#each forEachFinancialYear($dateMin, $dateMax).reverse() as fy}
              <option>{financialYear(fy)}</option>
            {/each}
          </select>
        </div>
      {/if}
      {#if showYearlyDepth && ($cashflowExpenseDepthAllowed.max > 1 || $cashflowIncomeDepthAllowed.max > 1)}
        <div class="hidden sm:flex items-center gap-2">
          <InputRange
            label="Expenses"
            bind:value={$cashflowExpenseDepth}
            allowed={$cashflowExpenseDepthAllowed}
          />
          <InputRange
            label="Income"
            bind:value={$cashflowIncomeDepth}
            allowed={$cashflowIncomeDepthAllowed}
          />
        </div>
      {/if}

      {#if readonly}
        <Badge variant="warning" size="sm" rounded>Read Only</Badge>
      {/if}

      <div class="paisa-control-wrap">
        <ThemeSwitcher />
      </div>

      <div class="paisa-control-wrap">
        <Actions />
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="paisa-main-content paisa-overflow-x-auto">
    <div class="paisa-page-container">
      <Spinner>
        {@render children?.()}
      </Spinner>
    </div>
  </main>
</div>

<style lang="scss">
  .paisa-app-layout {
    min-height: 100vh;
    background-color: var(--paisa-canvas-bg);
    color: var(--paisa-foreground);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
  }

  .paisa-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 16rem;
    background-color: var(--paisa-surface);
    border-right: 1px solid var(--paisa-border-subtle);
    z-index: 40;
    display: flex;
    flex-direction: column;
  }

  .paisa-sidebar-brand {
    height: 3.5rem;
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px solid var(--paisa-border-subtle);
    flex-shrink: 0;
  }

  .paisa-brand-icon {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background-color: var(--paisa-primary-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .paisa-brand-text {
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: -0.02em;
    color: var(--paisa-foreground);
  }

  .paisa-sidebar-nav {
    flex: 1 1 auto;
    padding: 1rem 0.75rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .paisa-nav-section {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .paisa-nav-heading {
    padding: 0 0.625rem 0.25rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--paisa-muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .paisa-nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--paisa-foreground);
    text-decoration: none;
    transition: background-color var(--paisa-transition-fast), color var(--paisa-transition-fast);

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-foreground);
    }

    &.is-active {
      background-color: var(--paisa-primary-subtle);
      color: var(--paisa-primary);
      font-weight: 600;
    }
  }

  .paisa-nav-icon {
    font-size: 0.75rem;
    width: 1rem;
    text-align: center;
    color: var(--paisa-muted-foreground);

    &.is-active {
      color: var(--paisa-primary);
    }
  }

  .paisa-nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-nav-subitems {
    padding-left: 1.75rem;
    padding-right: 0.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .paisa-nav-sublink {
    display: block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
    text-decoration: none;
    transition: color var(--paisa-transition-fast);

    &:hover {
      color: var(--paisa-foreground);
    }

    &.is-active {
      color: var(--paisa-primary);
      font-weight: 600;
    }
  }

  .paisa-sidebar-footer {
    padding: 0.75rem;
    border-top: 1px solid var(--paisa-border-subtle);
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    background-color: var(--paisa-surface);
    flex-shrink: 0;
  }

  .paisa-footer-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
    text-decoration: none;
    transition: background-color var(--paisa-transition-fast), color var(--paisa-transition-fast);

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-foreground);
    }

    &.is-active {
      background-color: var(--paisa-primary-subtle);
      color: var(--paisa-primary);
      font-weight: 600;
    }
  }

  .paisa-footer-icon {
    font-size: 0.75rem;
    width: 1rem;
    text-align: center;
  }

  .paisa-top-header {
    position: fixed;
    top: 0;
    right: 0;
    left: 16rem;
    height: 3.5rem;
    background-color: var(--paisa-surface);
    border-bottom: 1px solid var(--paisa-border-subtle);
    z-index: 30;
    padding: 0 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    max-width: calc(100vw - 16rem);
  }

  .paisa-header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .paisa-mobile-nav-bar {
    display: none;
    align-items: center;
    gap: 0.75rem;
  }

  .paisa-burger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--paisa-foreground);
    cursor: pointer;
    border-radius: var(--paisa-radius-md, 0.375rem);
    font-size: 1.125rem;
    transition: background-color var(--paisa-transition-fast);

    &:hover {
      background-color: var(--paisa-surface-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--paisa-primary);
      outline-offset: 2px;
    }
  }

  .paisa-mobile-brand {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .paisa-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .paisa-control-wrap {
    display: flex;
    align-items: center;
  }

  .paisa-search-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    background-color: var(--paisa-surface-raised);
    border: 1px solid var(--paisa-border-subtle);
    font-size: 0.75rem;
    color: var(--paisa-muted-foreground);
    cursor: pointer;
    width: 16rem;
    max-width: 100%;
    transition: border-color var(--paisa-transition-fast);

    &:hover {
      border-color: var(--paisa-border-strong);
    }
  }

  .paisa-search-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .paisa-search-kbd {
    padding: 0.125rem 0.375rem;
    font-size: 0.625rem;
    font-family: var(--paisa-font-mono);
    border-radius: 0.25rem;
    background-color: var(--paisa-surface);
    border: 1px solid var(--paisa-border-subtle);
  }

  .paisa-main-content {
    margin-left: 16rem;
    margin-top: 3.5rem;
    min-height: calc(100vh - 3.5rem);
    max-width: calc(100vw - 16rem);
    overflow-x: auto;
    background-color: var(--paisa-canvas);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .paisa-page-container {
    flex: 1 1 auto;
    padding: 1.5rem;
    max-width: 1600px;
    width: 100%;
    margin: 0 auto;
    min-width: 0;
  }

  .paisa-mobile-backdrop {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 50;
  }

  .paisa-mobile-drawer {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 18rem;
    max-width: 85vw;
    background-color: var(--paisa-surface);
    z-index: 50;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--paisa-border-subtle);
    box-shadow: var(--paisa-shadow-lg);
  }

  .paisa-drawer-header {
    height: 3.5rem;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--paisa-border-subtle);
    flex-shrink: 0;
  }

  .paisa-drawer-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .paisa-drawer-close {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--paisa-muted-foreground);
    cursor: pointer;
    border-radius: var(--paisa-radius-md, 0.375rem);
    font-size: 1.125rem;
    transition: background-color var(--paisa-transition-fast), color var(--paisa-transition-fast);

    &:hover {
      background-color: var(--paisa-surface-hover);
      color: var(--paisa-foreground);
    }

    &:focus-visible {
      outline: 2px solid var(--paisa-primary);
      outline-offset: 2px;
    }
  }

  @media (max-width: 1023px) {
    .paisa-sidebar {
      display: none;
    }

    .paisa-top-header {
      left: 0;
      max-width: 100vw;
      padding: 0 0.75rem;
    }

    .paisa-mobile-nav-bar {
      display: flex;
    }

    .paisa-search-trigger {
      display: none;
    }

    .paisa-main-content {
      margin-left: 0;
      max-width: 100vw;
    }

    .paisa-page-container {
      padding: 1rem;
    }
  }
</style>
