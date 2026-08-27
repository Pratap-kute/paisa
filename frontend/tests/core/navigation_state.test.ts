import { beforeEach, describe, expect, test } from "vitest";
import {
  type NavGroup,
  NavigationState,
} from "$lib/shared/state/navigation.svelte";

describe("NavigationState", () => {
  let nav: NavigationState;

  const liabilitiesGroup: NavGroup = {
    kind: "group",
    id: "liabilities",
    label: "Liabilities",
    children: [
      { label: "Balance", href: "/liabilities/balance" },
      { label: "Credit Cards", href: "/liabilities/credit_cards" },
      { label: "Repayment", href: "/liabilities/repayment" },
    ],
  };

  const assetsGroup: NavGroup = {
    kind: "group",
    id: "assets",
    label: "Assets",
    children: [
      { label: "Balance", href: "/assets/balance" },
      { label: "Net Worth", href: "/assets/networth" },
      { label: "Analysis", href: "/assets/analysis" },
    ],
  };

  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    nav = new NavigationState();
  });

  test("isPathActive correctly matches exact and nested paths", () => {
    expect(nav.isPathActive("/", "/")).toBe(true);
    expect(nav.isPathActive("/", "/assets")).toBe(false);
    expect(
      nav.isPathActive(
        "/liabilities/credit_cards",
        "/liabilities/credit_cards",
      ),
    ).toBe(true);
    expect(
      nav.isPathActive(
        "/liabilities/credit_cards",
        "/liabilities/credit_cards/hdfc-regalia",
      ),
    ).toBe(true);
    expect(
      nav.isPathActive("/liabilities/credit_cards", "/liabilities/balance"),
    ).toBe(false);
  });

  test("isGroupActive detects if any child link is currently active", () => {
    expect(nav.isGroupActive(liabilitiesGroup, "/liabilities/credit_cards"))
      .toBe(
        true,
      );
    expect(nav.isGroupActive(liabilitiesGroup, "/assets/balance")).toBe(false);
  });

  test("default expansion follows active route when no user preference is set", () => {
    expect(
      nav.isGroupExpanded(liabilitiesGroup, "/liabilities/credit_cards"),
    ).toBe(true);
    expect(nav.isGroupExpanded(liabilitiesGroup, "/assets/balance")).toBe(
      false,
    );
  });

  test("explicit user collapse overrides active route without getting stuck", () => {
    const currentPath = "/liabilities/credit_cards";
    // Initially expanded because route is active
    expect(nav.isGroupExpanded(liabilitiesGroup, currentPath)).toBe(true);

    // User clicks to collapse
    nav.toggleGroup(liabilitiesGroup, currentPath);

    // Group must be collapsed even though current route is active!
    expect(nav.isGroupExpanded(liabilitiesGroup, currentPath)).toBe(false);
    expect(nav.preferences["liabilities"]).toBe(false);

    // User clicks again to expand
    nav.toggleGroup(liabilitiesGroup, currentPath);
    expect(nav.isGroupExpanded(liabilitiesGroup, currentPath)).toBe(true);
    expect(nav.preferences["liabilities"]).toBe(true);
  });

  test("explicit user expand opens inactive group", () => {
    const currentPath = "/";
    // Initially closed on dashboard
    expect(nav.isGroupExpanded(assetsGroup, currentPath)).toBe(false);

    // User clicks to expand Assets
    nav.toggleGroup(assetsGroup, currentPath);
    expect(nav.isGroupExpanded(assetsGroup, currentPath)).toBe(true);
    expect(nav.preferences["assets"]).toBe(true);
  });

  test("onNavigate clears stale collapse override when entering the active group", () => {
    // User collapsed liabilities previously
    nav.toggleGroup(liabilitiesGroup, "/liabilities/credit_cards");
    expect(nav.isGroupExpanded(liabilitiesGroup, "/liabilities/credit_cards"))
      .toBe(
        false,
      );

    // User navigates into liabilities
    nav.onNavigate(liabilitiesGroup);

    // Stale collapse is reset, so active group expands for the user
    expect(nav.isGroupExpanded(liabilitiesGroup, "/liabilities/credit_cards"))
      .toBe(
        true,
      );
  });
});
