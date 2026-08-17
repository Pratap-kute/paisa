// deno-lint-ignore-file no-explicit-any no-var -- Ambient browser globals and untyped third-party modules require declaration syntax.
/// <reference types="@sveltejs/kit" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="esnext" />

declare type Item = import("svelte-dnd-action").Item;
declare type DndEvent<ItemType = Item> = import("svelte-dnd-action").DndEvent<
  ItemType
>;
declare namespace svelteHTML {
  interface HTMLAttributes<T> {
    "on:consider"?: (
      event: CustomEvent<DndEvent> & { target: EventTarget & T },
    ) => void;
    "on:finalize"?: (
      event: CustomEvent<DndEvent> & { target: EventTarget & T },
    ) => void;
  }
}

interface GoalSummary {
  type: string;
  name: string;
  id: string;
  icon: string;
  current: number;
  target: number;
  targetDate: string;
  priority: number;
}

interface UserConfig {
  default_currency: string;
  readonly: boolean;
  locale: string;
  journal_path: string;
  display_precision: number;
  db_path: string;
  financial_year_starting_month: number;
  amount_alignment_column: number;
  week_starting_day: number;
  goals: Record<string, Array<GoalSummary>>;
  accounts: {
    name: string;
    icon: string;
  }[];
  prediction?: {
    merchant_rules?: { merchant: string; account: string }[];
  };
}

interface Runtime {
  BrowserOpenURL: (url: string) => void;
}

declare var runtime: Runtime;

declare var USER_CONFIG: UserConfig;

declare var __now: any;

declare namespace App {
  interface Error {
    message: string;
    status?: number;
    stack?: string;
  }
  // interface Locals {}
  // interface PageData {}
  // interface Platform {}
}

declare module "textures" {
  const textures: any;
  export default textures;
}

declare module "xlsx" {
  export function read(data: any, opts?: any): any;
  export namespace utils {
    export function sheet_to_json<T = any>(sheet: any, opts?: any): T[];
  }
  const all: any;
  export default all;
}

declare module "xlsx-populate/browser/xlsx-populate.js" {
  export function fromDataAsync(
    data: ArrayBuffer,
    options: { password?: string },
  ): any;
}

declare module "arima/async" {
  export class Arima {
    constructor(options: object);
    train(points: number[]): Arima;
    predict(count: number): [number[], number[]];
  }
  const P: Promise<typeof Arima>;
  export default P;
}

declare module "d3-sankey-circular" {
  export function sankeyCircular(): any;
  export function sankeyJustify(): any;
}

declare module "d3-path-arrows" {
  export function pathArrows(): any;
}
