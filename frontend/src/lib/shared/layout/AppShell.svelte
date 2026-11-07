<script lang="ts">
  import { forEachFinancialYear } from "#lib/shared/formatters/date";
  import { page } from "$app/state";
  import { afterNavigate, goto } from "$app/navigation";
  import { onMount, type Snippet } from "svelte";
  import Logo from "./Logo.svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import Actions from "./Actions.svelte";
  import CommandPalette from "./CommandPalette.svelte";
  import Badge from "#lib/shared/ui/Badge.svelte";
  import Spinner from "#lib/shared/ui/Spinner.svelte";
  import { financialYear, resolveFinancialYear } from "#lib/domain/time";
  import {
    dateMax,
    dateMin,
    dateRangeOption,
    month,
    year,
    refreshNeedsConfirmation,
    confirmRefresh,
    cancelRefresh,
  } from "../../../store";
  import ConfirmDialog from "#lib/shared/ui/ConfirmDialog.svelte";
  import {
    cashflowExpenseDepth,
    cashflowExpenseDepthAllowed,
    cashflowIncomeDepth,
    cashflowIncomeDepthAllowed,
  } from "../../../persisted_store";
  import DateRange from "#lib/shared/ui/DateRange.svelte";
  import MonthPicker from "#lib/shared/ui/MonthPicker.svelte";
  import InputRange from "#lib/shared/ui/InputRange.svelte";
  import { validPeriod } from "#lib/shared/browser/period";

  import {
    type NavGroup,
    navigationState,
    type NavSection,
  } from "#lib/shared/state/navigation.svelte";

  interface Props {
    isBurger?: boolean | null;
    children?: Snippet;
  }

  let { isBurger = $bindable(false), children }: Props = $props();

  let mobileDrawerOpen = $state(false);
  let commandPaletteOpen = $state(false);
  let isMac = $state(false);

  onMount(() => {
    isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
  });

  afterNavigate(() => {
    mobileDrawerOpen = false;
    isBurger = false;
    const activeGroup = allNavGroups.find((g) =>
      navigationState.isGroupActive(g, pathname),
    );
    navigationState.onNavigate(activeGroup);
  });

  $effect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = mobileDrawerOpen ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  });

  const readonly = typeof USER_CONFIG !== "undefined" && USER_CONFIG.readonly;
  const isINR =
    typeof USER_CONFIG !== "undefined" &&
    USER_CONFIG.default_currency === "INR";

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        {
          kind: "link",
          label: "Dashboard",
          href: "/",
          icon: "fa-solid fa-gauge-high",
        },
        {
          kind: "link",
          label: "Insights",
          href: "/insights",
          icon: "fa-solid fa-lightbulb",
        },
      ],
    },
    {
      title: "Money",
      items: [
        {
          kind: "group",
          id: "cash-flow",
          label: "Cash Flow",
          icon: "fa-solid fa-arrow-trend-up",
          children: [
            { label: "Income Statement", href: "/cash_flow/income_statement" },
            { label: "Monthly", href: "/cash_flow/monthly" },
            { label: "Yearly", href: "/cash_flow/yearly" },
            { label: "Recurring", href: "/cash_flow/recurring" },
          ],
        },
        {
          kind: "link",
          label: "Income",
          href: "/income",
          icon: "fa-solid fa-money-bill-wave",
        },
        {
          kind: "group",
          id: "expenses",
          label: "Expenses",
          icon: "fa-solid fa-credit-card",
          children: [
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
          kind: "group",
          id: "assets",
          label: "Assets",
          icon: "fa-solid fa-wallet",
          children: [
            { label: "Balance", href: "/assets/balance" },
            { label: "Net Worth", href: "/assets/networth" },
            { label: "Investment", href: "/assets/investment" },
            { label: "Performance", href: "/assets/gain" },
            { label: "Allocation", href: "/assets/allocation" },
            { label: "Analysis", href: "/assets/analysis" },
          ],
        },
        {
          kind: "group",
          id: "liabilities",
          label: "Liabilities",
          icon: "fa-solid fa-building-columns",
          children: [
            { label: "Balance", href: "/liabilities/balance" },
            { label: "Credit Cards", href: "/liabilities/credit_cards" },
            { label: "Repayment", href: "/liabilities/repayment" },
            { label: "Interest", href: "/liabilities/interest" },
          ],
        },
        {
          kind: "link",
          label: "Goals",
          href: "/more/goals",
          icon: "fa-solid fa-bullseye",
        },
        {
          kind: "link",
          label: "Scenarios",
          href: "/more/scenarios",
          icon: "fa-solid fa-flask",
        },
      ],
    },
    {
      title: "Ledger",
      items: [
        {
          kind: "link",
          label: "Transactions",
          href: "/ledger/transaction",
          icon: "fa-solid fa-list-check",
        },
        ...(readonly
          ? []
          : [
              {
                kind: "link" as const,
                label: "Import",
                href: "/ledger/import",
                icon: "fa-solid fa-file-import",
              },
            ]),
        {
          kind: "link",
          label: "Editor",
          href: "/ledger/editor",
          icon: "fa-solid fa-pen-to-square",
        },
        {
          kind: "link",
          label: "Postings",
          href: "/ledger/posting",
          icon: "fa-solid fa-table-list",
        },
        {
          kind: "link",
          label: "Prices",
          href: "/ledger/price",
          icon: "fa-solid fa-chart-line",
        },
      ],
    },
    ...(isINR
      ? [
          {
            title: "Tax",
            items: [
              {
                kind: "link" as const,
                label: "Capital Gains",
                href: "/more/tax/capital_gains",
                icon: "fa-solid fa-receipt",
              },
              {
                kind: "link" as const,
                label: "Tax Harvest",
                href: "/more/tax/harvest",
                icon: "fa-solid fa-scissors",
              },
              {
                kind: "link" as const,
                label: "Schedule AL",
                href: "/more/tax/schedule_al",
                icon: "fa-solid fa-file-lines",
              },
            ],
          },
        ]
      : []),
    {
      title: "Tools",
      items: [
        {
          kind: "link",
          label: "Sheets",
          href: "/more/sheets",
          icon: "fa-solid fa-table",
        },
      ],
    },
  ];

  const systemSection: NavSection = {
    title: "System",
    items: [
      {
        kind: "link",
        label: "Configuration",
        href: "/more/config",
        icon: "fa-solid fa-gear",
      },
      {
        kind: "group",
        id: "system",
        label: "Diagnostics",
        icon: "fa-solid fa-stethoscope",
        children: [
          { label: "Doctor", href: "/more/doctor" },
          { label: "Logs", href: "/more/logs" },
        ],
      },
      {
        kind: "link",
        label: "About",
        href: "/more/about",
        icon: "fa-solid fa-circle-info",
      },
    ],
  };

  let allNavGroups = $derived(
    [...navSections, systemSection].flatMap((sec) =>
      sec.items.filter((item): item is NavGroup => item.kind === "group"),
    ),
  );

  let pathname = $derived(page.url.pathname);
  let showDateRange = $derived(
    pathname === "/cash_flow/monthly" ||
      pathname === "/expense/monthly" ||
      pathname === "/assets/networth",
  );
  let showMonthPicker = $derived(
    pathname === "/cash_flow/recurring" ||
      pathname === "/expense/monthly" ||
      pathname === "/expense/budget" ||
      pathname === "/insights",
  );
  let insightsMonth = $derived(
    validPeriod(page.url.searchParams.get("period")) ?? month.value,
  );

  async function selectInsightsMonth(period: string) {
    if (page.url.searchParams.get("period") === period) return;
    const url = new URL(page.url.href);
    url.searchParams.set("period", period);
    await goto(`${url.pathname}${url.search}`, {
      reset: false,
    });
  }
  let showFinancialYearPicker = $derived(
    pathname === "/cash_flow/income_statement" ||
      pathname === "/cash_flow/yearly" ||
      pathname === "/expense/yearly" ||
      pathname === "/more/tax/schedule_al",
  );
  let showYearlyDepth = $derived(pathname === "/cash_flow/yearly");

  // The year store starts empty and the available range changes once a page has
  // loaded its data, so keep the year within the range (latest by default).
  $effect(() => {
    if (!showFinancialYearPicker) return;
    const available = forEachFinancialYear(dateMin.value, dateMax.value)
      .reverse()
      .map(financialYear);
    const next = resolveFinancialYear(year.value, available);
    if (next !== year.value) year.value = next;
  });

  const navLinkClass =
    "flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] pointer-coarse:min-h-11";
  const navLinkActiveClass = "bg-primary-subtle font-semibold text-primary";
  const navGroupButtonClass =
    "flex w-full items-center gap-3 rounded-md border-0 bg-transparent px-2.5 py-1.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)]";
  const navSubLinkClass =
    "block rounded px-2.5 py-1.5 text-[0.8125rem] text-foreground/70 no-underline transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] pointer-coarse:min-h-11 pointer-coarse:py-3";
  const navSubLinkActiveClass =
    "font-semibold text-primary bg-primary-subtle/70";
</script>

{#snippet navSectionBlock(
  section: NavSection,
  scope: string,
  muted: boolean,
  onNavigate?: () => void,
)}
  {@const headingId = `${scope}-nav-${section.title.toLowerCase()}`}
  <div class="flex flex-col gap-0.5" role="group" aria-labelledby={headingId}>
    <div
      id={headingId}
      class="px-2.5 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
    >
      {section.title}
    </div>
    {#each section.items as item (item.kind === "group" ? item.id : item.href)}
      {#if item.kind === "link"}
        {@const active = navigationState.isPathActive(item.href, pathname)}
        <a
          href={item.href}
          class="{navLinkClass} {muted ? 'text-xs' : ''} {active
            ? navLinkActiveClass
            : muted
              ? 'text-muted-foreground'
              : ''}"
          aria-current={active ? "page" : undefined}
          onclick={onNavigate}
        >
          {#if item.icon}
            <i
              class="{item.icon} w-4 text-center text-xs {active || muted
                ? ''
                : 'text-muted-foreground'} {active ? 'text-primary' : ''}"
              aria-hidden="true"
            ></i>
          {/if}
          <span class="truncate">{item.label}</span>
        </a>
      {:else}
        {@const active = navigationState.isGroupActive(item, pathname)}
        {@const expanded = navigationState.isGroupExpanded(item, pathname)}
        {@const panelId = `${scope}-nav-group-${item.id}`}
        <button
          type="button"
          class="{navGroupButtonClass} {muted ? 'text-xs' : ''} {active
            ? navLinkActiveClass
            : muted
              ? 'text-muted-foreground'
              : ''} pointer-coarse:min-h-11"
          aria-expanded={expanded}
          aria-controls={panelId}
          onclick={() => navigationState.toggleGroup(item, pathname)}
        >
          {#if item.icon}
            <i
              class="{item.icon} w-4 text-center text-xs {active || muted
                ? ''
                : 'text-muted-foreground'} {active ? 'text-primary' : ''}"
              aria-hidden="true"
            ></i>
          {/if}
          <span class="min-w-0 flex-1 truncate">{item.label}</span>
          <i
            class="fa-solid fa-chevron-down w-3 text-[0.625rem] text-muted-foreground transition-transform {expanded
              ? 'rotate-180'
              : ''}"
            aria-hidden="true"
          ></i>
        </button>
        <div
          id={panelId}
          class="flex-col gap-0.5 pl-7 pr-1 {expanded ? 'flex' : 'hidden'}"
        >
          {#if expanded}
            {#each item.children as sub (sub.href)}
              {@const subActive = navigationState.isPathActive(
                sub.href,
                pathname,
              )}
              <a
                href={sub.href}
                class="{navSubLinkClass} {subActive
                  ? navSubLinkActiveClass
                  : ''}"
                aria-current={subActive ? "page" : undefined}
                onclick={onNavigate}
              >
                {sub.label}
              </a>
            {/each}
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet navPanel(scope: string, onNavigate?: () => void)}
  {#each navSections as section (section.title)}
    {@render navSectionBlock(section, scope, false, onNavigate)}
  {/each}
{/snippet}

{#snippet systemNav(scope: string, onNavigate?: () => void)}
  {@render navSectionBlock(systemSection, scope, true, onNavigate)}
{/snippet}

<svelte:window
  onkeydown={(e) =>
    e.key === "Escape" && mobileDrawerOpen && (mobileDrawerOpen = false)}
/>

<div class="min-h-screen overflow-x-hidden bg-canvas text-foreground">
  <!-- Desktop Sidebar -->
  <aside
    class="fixed bottom-0 left-0 top-0 z-40 hidden w-64 flex-col border-r border-border-subtle bg-surface lg:flex"
  >
    <div
      class="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-5"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle"
      >
        <Logo size={20} />
      </div>
      <span class="text-base font-bold tracking-tight text-foreground"
        >Paisa</span
      >
    </div>

    <nav
      class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 [scrollbar-gutter:stable] [scrollbar-width:thin]"
      aria-label="main navigation"
    >
      {@render navPanel("desktop")}
    </nav>

    <div class="shrink-0 border-t border-border-subtle bg-surface px-3 py-3">
      {@render systemNav("desktop")}
    </div>
  </aside>

  <!-- Mobile Drawer -->
  {#if mobileDrawerOpen}
    <div
      class="fixed inset-0 z-50 bg-black/50 lg:hidden"
      onclick={() => (mobileDrawerOpen = false)}
      onkeydown={(e) => e.key === "Escape" && (mobileDrawerOpen = false)}
      tabindex="-1"
      role="button"
      aria-label="Close navigation overlay"
    ></div>
    <div
      class="fixed bottom-0 left-0 top-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border-subtle bg-surface shadow-[var(--paisa-shadow-lg)] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation drawer"
    >
      <div
        class="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle"
          >
            <Logo size={20} />
          </div>
          <span class="text-base font-bold tracking-tight text-foreground"
            >Paisa</span
          >
        </div>
        <button
          type="button"
          onclick={() => (mobileDrawerOpen = false)}
          class="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)]"
          aria-label="Close navigation menu"
        >
          <i class="fa-solid fa-xmark text-lg" aria-hidden="true"></i>
        </button>
      </div>

      <nav
        class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 [scrollbar-gutter:stable] [scrollbar-width:thin]"
        aria-label="drawer navigation"
      >
        {@render navPanel("drawer", () => (mobileDrawerOpen = false))}
      </nav>

      <div class="shrink-0 border-t border-border-subtle px-3 py-3">
        {@render systemNav("drawer", () => (mobileDrawerOpen = false))}
      </div>
    </div>
  {/if}

  <!-- Top Header -->
  <header
    class="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border-subtle bg-surface px-3 lg:left-64 lg:max-w-[calc(100vw-16rem)] lg:px-6"
  >
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onclick={() => (mobileDrawerOpen = true)}
          class="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md border-0 bg-transparent text-foreground transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)]"
          aria-label="Open navigation menu"
        >
          <i class="fa-solid fa-bars text-lg" aria-hidden="true"></i>
        </button>

        <div class="flex items-center gap-2.5">
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-subtle"
          >
            <Logo size={20} />
          </div>
          <span class="text-base font-bold tracking-tight text-foreground"
            >Paisa</span
          >
        </div>
      </div>

      <button
        type="button"
        onclick={() => (commandPaletteOpen = true)}
        class="hidden w-64 max-w-full cursor-pointer items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paisa-primary)] lg:flex"
        aria-label="Open Command Palette and search"
      >
        <i class="fa-solid fa-magnifying-glass text-[11px]" aria-hidden="true"
        ></i>
        <span class="min-w-0 flex-1 truncate">Search…</span>
        <kbd
          class="rounded border border-border-subtle bg-surface px-1.5 py-0.5 font-mono text-[0.6875rem]"
          >{isMac ? "⌘K" : "Ctrl K"}</kbd
        >
      </button>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <!-- Mobile Search Trigger -->
      <button
        type="button"
        onclick={() => (commandPaletteOpen = true)}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-raised text-muted-foreground transition-colors hover:text-foreground pointer-coarse:h-11 pointer-coarse:w-11 lg:hidden"
        aria-label="Search"
      >
        <i class="fa-solid fa-magnifying-glass text-xs"></i>
      </button>

      <!-- Page Contextual Filters (DateRange, Month, FY, Depth) -->
      {#if showDateRange || showMonthPicker || showFinancialYearPicker || (showYearlyDepth && (cashflowExpenseDepthAllowed.value.max > 1 || cashflowIncomeDepthAllowed.value.max > 1))}
        <div class="hidden sm:flex items-center gap-2">
          {#if showDateRange}
            <div>
              <DateRange
                bind:value={dateRangeOption.value}
                dateMin={dateMin.value}
                dateMax={dateMax.value}
              />
            </div>
          {/if}

          {#if showMonthPicker}
            <div>
              {#if pathname === "/insights"}
                <MonthPicker
                  value={insightsMonth}
                  max={dateMax.value}
                  min={dateMin.value}
                  onchange={selectInsightsMonth}
                />
              {:else}
                <MonthPicker
                  bind:value={month.value}
                  max={dateMax.value}
                  min={dateMin.value}
                />
              {/if}
            </div>
          {/if}

          {#if showFinancialYearPicker}
            <div
              class="relative inline-flex h-8 items-center rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface px-2.5 text-xs font-semibold text-foreground shadow-xs transition-colors hover:border-border-strong"
            >
              <i
                class="fas fa-calendar-days mr-1.5 text-[0.75rem] text-muted-foreground"
                aria-hidden="true"
              ></i>
              <select
                bind:value={year.value}
                class="cursor-pointer appearance-none border-0 bg-transparent pr-4 font-semibold text-foreground focus:outline-none"
              >
                {#each forEachFinancialYear(dateMin.value, dateMax.value).reverse() as fy}
                  <option class="bg-surface text-foreground"
                    >{financialYear(fy)}</option
                  >
                {/each}
              </select>
              <i
                class="fas fa-chevron-down pointer-events-none absolute right-2 text-[0.625rem] text-muted-foreground"
                aria-hidden="true"
              ></i>
            </div>
          {/if}

          {#if showYearlyDepth && (cashflowExpenseDepthAllowed.value.max > 1 || cashflowIncomeDepthAllowed.value.max > 1)}
            <div class="flex items-center gap-1.5">
              <InputRange
                label="Expenses"
                bind:value={cashflowExpenseDepth.value}
                allowed={cashflowExpenseDepthAllowed.value}
              />
              <InputRange
                label="Income"
                bind:value={cashflowIncomeDepth.value}
                allowed={cashflowIncomeDepthAllowed.value}
              />
            </div>
          {/if}
        </div>

        <!-- Visual Divider between page filters and global actions -->
        <div
          class="hidden sm:block h-4 w-px bg-[var(--paisa-border-subtle)] mx-0.5"
          aria-hidden="true"
        ></div>
      {/if}

      {#if readonly}
        <Badge variant="warning" size="sm" rounded>Read Only</Badge>
      {/if}

      <ThemeSwitcher />

      <Actions />
    </div>
  </header>

  <!-- Main Content -->
  <main
    class="paisa-overflow-x-auto ml-0 mt-14 flex min-h-[calc(100vh-3.5rem)] min-w-0 max-w-full flex-col overflow-x-auto bg-canvas lg:ml-64 lg:max-w-[calc(100vw-16rem)]"
  >
    <div class="flex w-full min-w-0 flex-1 flex-col p-4 lg:p-6">
      <Spinner>
        {@render children?.()}
      </Spinner>
    </div>
  </main>
</div>

<CommandPalette bind:open={commandPaletteOpen} />

<ConfirmDialog
  open={refreshNeedsConfirmation.value}
  title="Discard unsaved changes?"
  description="You have unsaved changes. Refreshing will discard them."
  confirmLabel="Discard"
  cancelLabel="Keep editing"
  variant="danger"
  onconfirm={confirmRefresh}
  oncancel={cancelRefresh}
/>
