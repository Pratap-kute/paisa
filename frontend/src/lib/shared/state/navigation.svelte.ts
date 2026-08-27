import { PersistedState } from "./persisted.svelte";

export interface NavChild {
  label: string;
  href: string;
}

export interface NavLink {
  kind: "link";
  label: string;
  href: string;
  icon?: string;
}

export interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon?: string;
  children: NavChild[];
}

export type NavEntry = NavLink | NavGroup;

export interface NavSection {
  title: string;
  items: NavEntry[];
}

export class NavigationState {
  #expandedPreferences = new PersistedState<Record<string, boolean>>(
    "paisa_nav_expanded_groups",
    {},
  );

  get preferences(): Record<string, boolean> {
    return this.#expandedPreferences.value;
  }

  isPathActive(targetHref: string, currentPath: string): boolean {
    if (targetHref === "/") {
      return currentPath === "/";
    }
    return (
      currentPath === targetHref || currentPath.startsWith(`${targetHref}/`)
    );
  }

  groupChildHrefs(group: NavGroup): string[] {
    return group.children.map((child) => child.href);
  }

  isGroupActive(group: NavGroup, currentPath: string): boolean {
    return this.groupChildHrefs(group).some((href) =>
      this.isPathActive(href, currentPath)
    );
  }

  /**
   * Evaluates if a navigation group is expanded.
   * State Precedence:
   * 1. Explicit user preference in persistent store (true / false)
   * 2. Default: auto-expanded if current route is inside this group
   */
  isGroupExpanded(group: NavGroup, currentPath: string): boolean {
    const prefs = this.#expandedPreferences.value;
    if (typeof prefs[group.id] === "boolean") {
      return prefs[group.id];
    }
    return this.isGroupActive(group, currentPath);
  }

  /**
   * Toggles a navigation group explicitly and persists user intent.
   */
  toggleGroup(group: NavGroup, currentPath: string): void {
    const currentlyExpanded = this.isGroupExpanded(group, currentPath);
    const nextPrefs = {
      ...this.#expandedPreferences.value,
      [group.id]: !currentlyExpanded,
    };
    this.#expandedPreferences.value = nextPrefs;
  }

  /**
   * Called on route navigation.
   * If user navigates directly into an active group, clears any stale collapse override
   * so the current section is visible.
   */
  onNavigate(activeGroup?: NavGroup): void {
    if (activeGroup) {
      const prefs = this.#expandedPreferences.value;
      if (prefs[activeGroup.id] === false) {
        const nextPrefs = { ...prefs };
        delete nextPrefs[activeGroup.id];
        this.#expandedPreferences.value = nextPrefs;
      }
    }
  }
}

export const navigationState = new NavigationState();
