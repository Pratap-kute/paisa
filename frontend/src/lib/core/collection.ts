// deno-lint-ignore-file no-explicit-any -- A few implementation signatures bridge typed lodash-style overloads.
import {
  maxBy as toolkitMaxBy,
  minBy as toolkitMinBy,
  sortBy as toolkitSortBy,
} from "es-toolkit";

export function assign<T extends object, U extends object>(
  target: T,
  source: U,
): T & U;
export function assign<T extends object, U extends object, V extends object>(
  target: T,
  source1: U,
  source2: V,
): T & U & V;
export function assign<
  T extends object,
  U extends object,
  V extends object,
  W extends object,
>(
  target: T,
  source1: U,
  source2: V,
  source3: W,
): T & U & V & W;
export function assign(target: object, ...sources: object[]) {
  return Object.assign(target, ...sources);
}

export function each<T>(
  items: T[],
  iteratee: (value: T, key: number) => void,
): void;
export function each<T extends object>(
  items: T,
  iteratee: (value: T[keyof T], key: string) => void,
): void;
export function each(
  items: any,
  iteratee: (value: any, key: any) => void,
): void {
  if (Array.isArray(items)) {
    items.forEach(iteratee);
    return;
  }
  Object.entries(items ?? {}).forEach(([key, value]) => iteratee(value, key));
}

export function every<T>(
  items: T[],
  predicate: (value: T) => boolean,
): boolean {
  return items.every(predicate);
}

export function filter<T>(items: T[], predicate: (value: T) => boolean): T[] {
  return items.filter(predicate);
}

export function find<T>(
  items: T[],
  predicate: Partial<T> | ((value: T) => boolean),
): T | undefined {
  if (typeof predicate === "function") {
    return items.find(predicate);
  }
  return items.find((item) =>
    Object.entries(predicate).every(([key, value]) =>
      (item as Record<string, unknown>)[key] === value
    )
  );
}

export function findIndex<T>(
  items: T[],
  predicate: (value: T) => boolean,
): number {
  return items.findIndex(predicate);
}

export function first<T>(items: T[]): T | undefined {
  return items[0];
}

export function floor(value: number): number {
  return Math.floor(value);
}

export function fromPairs<T>(pairs: Array<[string, T]>): Record<string, T> {
  return Object.fromEntries(pairs);
}

export function includes<T>(items: T[], value: T): boolean;
export function includes(items: string, value: string): boolean;
export function includes(items: string | unknown[], value: unknown): boolean {
  return typeof items === "string"
    ? items.includes(String(value))
    : items.includes(value);
}

export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length === 0;
  }
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function keys<T extends object>(
  value: T,
): Array<Extract<keyof T, string>> {
  return Object.keys(value) as Array<Extract<keyof T, string>>;
}

export function map<T, U>(
  items: T[],
  iteratee: (value: T, index: number) => U,
): U[];
export function map<T extends object, U>(
  items: T,
  iteratee: (value: T[keyof T], key: string) => U,
): U[];
export function map(
  items: any,
  iteratee: (value: any, key: any) => any,
): any[] {
  if (Array.isArray(items)) return items.map(iteratee);
  return Object.entries(items ?? {}).map(([key, value]) =>
    iteratee(value, key)
  );
}

export function max(items: number[]): number | undefined {
  return items.length === 0 ? undefined : Math.max(...items);
}

export function maxBy<T>(
  items: T[],
  iteratee: (value: T) => { valueOf(): number },
): T | undefined {
  return toolkitMaxBy(items, (value) => iteratee(value).valueOf());
}

export function minBy<T>(
  items: T[],
  iteratee: (value: T) => { valueOf(): number },
): T | undefined {
  return toolkitMinBy(items, (value) => iteratee(value).valueOf());
}

export function now(): number {
  return Date.now();
}

export function reverse<T>(items: T[]): T[] {
  return items.reverse();
}

export function some<T>(items: T[], predicate: (value: T) => boolean): boolean {
  return items.some(predicate);
}

export function sortBy<T>(items: T[]): T[];
export function sortBy<T>(items: T[], iteratee: (value: T) => unknown): T[];
export function sortBy<T>(items: T[], iteratee?: (value: T) => unknown): T[] {
  if (!iteratee) {
    return [...items].sort((a, b) => String(a).localeCompare(String(b)));
  }
  return toolkitSortBy(
    items as object[],
    [iteratee as (value: object) => unknown],
  ) as T[];
}

export function toNumber(value: unknown): number {
  return Number(value);
}

export function values<T extends object>(value: T): Array<T[keyof T]> {
  return Object.values(value) as Array<T[keyof T]>;
}
