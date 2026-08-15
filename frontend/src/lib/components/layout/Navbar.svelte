<script lang="ts">
  import { page } from "$app/stores";
  import Actions from "$lib/components/layout/Actions.svelte";
  import { month, year, dateMax, dateMin, dateRangeOption } from "../../../store";
  import {
    cashflowExpenseDepth,
    cashflowExpenseDepthAllowed,
    cashflowIncomeDepth,
    cashflowIncomeDepthAllowed,
    obscure
  } from "../../../persisted_store";
  import _ from "lodash";
  import { financialYear, forEachFinancialYear, helpUrl, isMobile, now } from "$lib/core/utils";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import DateRange from "$lib/components/ui/DateRange.svelte";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import MonthPicker from "$lib/components/ui/MonthPicker.svelte";
  import Logo from "./Logo.svelte";
  import InputRange from "$lib/components/ui/InputRange.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  interface Props {
    isBurger?: boolean;
  }

  let { isBurger = $bindable(null) }: Props = $props();
  const readonly = USER_CONFIG.readonly;

  onMount(async () => {
    if (get(year) == "") {
      year.set(financialYear(now()));
    }
  });

  const RecurringIcons = [
    { icon: "fa-circle-check", color: "success", label: "Cleared" },
    { icon: "fa-circle-check", color: "warning-dark", label: "Cleared late" },
    { icon: "fa-exclamation-triangle", color: "danger", label: "Past due" },
    { icon: "fa-circle-check", color: "grey", label: "Upcoming" }
  ];

  interface Link {
    label: string;
    href: string;
    tag?: string;
    help?: string;
    hide?: boolean;
    dateRangeSelector?: boolean;
    monthPicker?: boolean;
    financialYearPicker?: boolean;
    maxDepthSelector?: boolean;
    recurringIcons?: boolean;
    children?: Link[];
    disablePreload?: boolean;
  }
  const links: Link[] = [
    { label: "Dashboard", href: "/", hide: true },
    {
      label: "Cash Flow",
      href: "/cash_flow",
      children: [
        { label: "Income Statement", href: "/income_statement", financialYearPicker: true },
        { label: "Monthly", href: "/monthly", dateRangeSelector: true },
        {
          label: "Yearly",
          href: "/yearly",
          financialYearPicker: true,
          maxDepthSelector: true
        },
        {
          label: "Recurring",
          href: "/recurring",
          help: "recurring",
          monthPicker: true,
          recurringIcons: true
        }
      ]
    },
    {
      label: "Expenses",
      href: "/expense",
      children: [
        { label: "Monthly", href: "/monthly", monthPicker: true, dateRangeSelector: true },
        { label: "Yearly", href: "/yearly", financialYearPicker: true },
        { label: "Budget", href: "/budget", help: "budget", monthPicker: true }
      ]
    },
    {
      label: "Assets",
      href: "/assets",
      children: [
        { label: "Balance", href: "/balance" },
        { label: "Networth", href: "/networth", dateRangeSelector: true },
        { label: "Investment", href: "/investment" },
        { label: "Gain", href: "/gain" },
        { label: "Allocation", href: "/allocation", help: "allocation-targets" },
        { label: "Analysis", href: "/analysis", tag: "alpha", help: "analysis" }
      ]
    },
    {
      label: "Liabilities",
      href: "/liabilities",
      children: [
        { label: "Balance", href: "/balance" },
        { label: "Credit Cards", href: "/credit_cards", help: "credit-cards" },
        { label: "Repayment", href: "/repayment" },
        { label: "Interest", href: "/interest" }
      ]
    },
    { label: "Income", href: "/income" },
    {
      label: "Ledger",
      href: "/ledger",
      children: [
        { label: "Import", href: "/import", help: "import" },
        { label: "Editor", href: "/editor", help: "editor", disablePreload: true },
        { label: "Transactions", href: "/transaction", help: "bulk-edit" },
        { label: "Postings", href: "/posting" },
        { label: "Price", href: "/price" }
      ]
    },
    {
      label: "More",
      href: "/more",
      children: [
        { label: "Configuration", href: "/config", help: "config" },
        { label: "Sheets", href: "/sheets", help: "sheets", disablePreload: true },
        { label: "Goals", href: "/goals", help: "goals" },
        { label: "Doctor", href: "/doctor" },
        { label: "Logs", href: "/logs" }
      ]
    }
  ];

  const tax = {
    label: "Tax",
    href: "/tax",
    help: "tax",
    children: [
      { label: "Harvest", href: "/harvest", help: "tax-harvesting" },
      { label: "Capital Gains", href: "/capital_gains", help: "capital-gains" },
      {
        label: "Schedule AL",
        href: "/schedule_al",
        help: "schedule-al",
        financialYearPicker: true
      }
    ]
  };

  if (USER_CONFIG.default_currency == "INR") {
    _.last(links).children.push(tax);
  }

  const about = { label: "About", href: "/about" };
  _.last(links).children.push(about);

  let normalizedPath = $derived($page.url.pathname?.replace(/(.+)\/$/, ""));

  let selectedLink: Link = $derived.by(() => {
    if (!normalizedPath) return null;
    let link = _.find(links, (l) => normalizedPath == l.href);
    if (!link) {
      link = _.find(
        links,
        (l) => !_.isEmpty(l.children) && normalizedPath.startsWith(l.href)
      );
    }
    return link || null;
  });

  let selectedSubLink: Link = $derived.by(() => {
    if (!selectedLink || _.isEmpty(selectedLink.children)) return null;
    let sublink = _.find(
      selectedLink.children,
      (l) => normalizedPath == selectedLink.href + l.href
    );
    if (!sublink) {
      sublink = _.find(selectedLink.children, (l) =>
        normalizedPath.startsWith(selectedLink.href + l.href)
      );
    }
    return sublink || null;
  });

  let selectedSubSubLink: Link = $derived.by(() => {
    if (!selectedLink || !selectedSubLink || _.isEmpty(selectedSubLink.children)) return null;
    return (
      _.find(selectedSubLink.children, (l) =>
        normalizedPath.startsWith(selectedLink.href + selectedSubLink.href + l.href)
      ) || null
    );
  });
</script>

<nav class="navbar px-2 is-transparent" aria-label="main navigation">
  <div class="navbar-brand">
    <a
      href="/"
      class:is-active={normalizedPath == "/"}
      class="navbar-item is-size-4 has-text-weight-medium"
    >
      {#if $obscure}
        <span class="icon is-small is-size-5">
          <i class="fas fa-user-secret"></i>
        </span><span class="ml-2 is-primary-color">Paisa</span>
      {:else}
        <Logo size={22} /><span class="ml-1 is-primary-color">Paisa</span>
      {/if}
    </a>
    <button
      type="button"
      class="navbar-burger"
      class:is-active={isBurger === true}
      onclick={(_e) => (isBurger = !isBurger)}
      aria-label="menu"
      aria-expanded={isBurger}
      data-target="navbarBasicExample"
    >
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </button>
  </div>

  <div class="navbar-menu" class:is-active={isBurger === true}>
    <div class="navbar-start">
      {#each links as link}
        {#if _.isEmpty(link.children)}
          {#if !link.hide}
            <a
              class="navbar-item"
              href={link.href}
              data-sveltekit-preload-data={link.disablePreload ? "tap" : "hover"}
              class:is-active={normalizedPath == link.href}>{link.label}</a
            >
          {/if}
        {:else}
          <div class="navbar-item has-dropdown is-hoverable">
            <button
              type="button"
              class="navbar-link"
              style="background: transparent; border: none; font: inherit; cursor: pointer; text-align: left; width: 100%;"
              class:is-active={normalizedPath.startsWith(link.href)}
              onclick={(e) =>
                isMobile() && e.currentTarget.parentElement?.classList.toggle("is-active")}
              >{link.label}</button
            >
            <div class="navbar-dropdown {!isMobile() && 'is-boxed'}">
              {#each link.children as sublink}
                {@const href = link.href + sublink.href}
                {#if _.isEmpty(sublink.children)}
                  <a
                    class="navbar-item"
                    {href}
                    data-sveltekit-preload-data={sublink.disablePreload ? "tap" : "hover"}
                    class:is-active={normalizedPath.startsWith(href)}>{sublink.label}</a
                  >
                {:else}
                  <div class="nested has-dropdown navbar-item">
                    <div
                      class="navbar-link is-arrowless is-flex is-justify-content-space-between is-active"
                      class:is-active={normalizedPath.startsWith(href)}
                    >
                      <span>{sublink.label}</span>
                      <span class="icon is-small">
                        <i
                          class="fas {isMobile() ? 'fa-angle-down' : 'fa-angle-right'}"
                          aria-hidden="true"
                        ></i>
                      </span>
                    </div>

                    <div class="dropdown-menu">
                      <div class="dropdown-content">
                        {#each sublink.children as subsublink}
                          <a
                            href={href + subsublink.href}
                            class="navbar-item"
                            data-sveltekit-preload-data={subsublink.disablePreload
                              ? "tap"
                              : "hover"}
                            class:is-active={normalizedPath == href + subsublink.href}
                            >{subsublink.label}</a
                          >
                        {/each}
                      </div>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
    <div class="navbar-end" style="margin-right: 0.3em">
      <div class="navbar-item">
        <div class="field is-grouped">
          {#if readonly}
            <p class="control">
              <span data-tippy-content="<p>Paisa is in readonly mode</p>">
                <Badge variant="danger" rounded class="mt-1">readonly</Badge>
              </span>
            </p>
          {/if}

          <p class="control">
            <ThemeSwitcher />
          </p>
          <p class="control">
            <Actions />
          </p>
        </div>
      </div>
    </div>
  </div>
</nav>

<div class="mt-3 px-3 is-flex is-justify-content-space-between">
  {#if selectedLink}
    <nav
      style="margin-left: 0.73rem;"
      class="breadcrumb has-chevron-separator mb-0 is-small"
      aria-label="breadcrumbs"
    >
      <ul>
        <li>
          <span class="is-inactive">{selectedLink.label}</span>
          {#if selectedLink.help}
            <a class="p-0 ml-1 has-text-grey" aria-label="Help documentation" href={helpUrl(selectedLink.help)}
              ><span class="icon is-small">
                <i class="fas fa-circle-question"></i>
              </span></a
            >
          {/if}

          {#if selectedLink.tag}
            <Badge variant="warning" rounded class="is-small">{selectedLink.tag}</Badge>
          {/if}
        </li>
        {#if selectedSubLink}
          <li>
            <span class="is-inactive">{selectedSubLink.label}</span>

            {#if selectedSubLink.help}
              <a class="p-0 ml-1 has-text-grey" aria-label="Sublink help documentation" href={helpUrl(selectedSubLink.help)}
                ><span class="icon is-small">
                  <i class="fas fa-circle-question"></i>
                </span></a
              >
            {/if}

            {#if selectedSubLink.tag}
              <Badge variant="warning" rounded class="is-small mr-2">{selectedSubLink.tag}</Badge>
            {/if}
          </li>
        {/if}

        {#if selectedSubLink}
          {#if selectedSubSubLink}
            <li>
              <span class="is-inactive">{selectedSubSubLink.label}</span>
            </li>
          {:else if selectedLink.href + selectedSubLink.href != normalizedPath}
            <li>
              <span class="is-inactive">{decodeURIComponent(_.last(normalizedPath.split("/")) || "")}</span>
            </li>
          {/if}
        {/if}
      </ul>
    </nav>
  {/if}

  <div class="mr-3 is-flex" style="gap: 12px">
    {#if selectedSubLink?.recurringIcons}
      <div class="is-flex gap-5 is-align-items-center has-text-grey">
        {#each RecurringIcons as icon}
          <div data-tippy-content="<p>{icon.label}</p>">
            <span class="icon is-small has-text-{icon.color}">
              <i class={"fas " + icon.icon}></i>
            </span>
            <span class="is-hidden-mobile">{icon.label}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if selectedSubLink?.maxDepthSelector && ($cashflowExpenseDepthAllowed.max > 1 || $cashflowIncomeDepthAllowed.max > 1)}
      <div class="dropdown is-right is-hoverable">
        <div class="dropdown-trigger">
          <button class="button is-small" aria-label="Depth settings" aria-haspopup="true">
            <span class="icon is-small">
              <i class="fas fa-sliders"></i>
            </span>
          </button>
        </div>
        <div class="dropdown-menu" role="menu">
          <div class="dropdown-content px-2 py-2">
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
        </div>
      </div>
    {/if}

    {#if selectedSubLink?.dateRangeSelector || selectedLink?.dateRangeSelector}
      <div>
        <DateRange bind:value={$dateRangeOption} dateMin={$dateMin} dateMax={$dateMax} />
      </div>
    {/if}

    {#if selectedSubLink?.monthPicker || selectedLink?.monthPicker}
      <MonthPicker bind:value={$month} max={$dateMax} min={$dateMin} />
    {/if}

    {#if selectedSubSubLink?.financialYearPicker || selectedSubLink?.financialYearPicker || selectedLink?.financialYearPicker}
      <div class="has-text-centered">
        <div class="select is-small">
          <select bind:value={$year}>
            {#each forEachFinancialYear($dateMin, $dateMax).reverse() as fy}
              <option>{financialYear(fy)}</option>
            {/each}
          </select>
        </div>
      </div>
    {/if}
  </div>
</div>
